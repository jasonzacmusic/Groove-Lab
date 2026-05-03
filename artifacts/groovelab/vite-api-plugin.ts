import type { Plugin, ViteDevServer, Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

type Route = {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  filePath: string;
  isDynamic: boolean;
  segmentDepth: number;
};

type QueryValue = string | string[];
type Query = Record<string, QueryValue>;

interface VercelLikeRequest extends IncomingMessage {
  query: Query;
  body?: unknown;
}

interface VercelLikeResponse extends ServerResponse {
  status(code: number): VercelLikeResponse;
  json(data: unknown): VercelLikeResponse;
  send(data: unknown): VercelLikeResponse;
}

type Handler = (req: VercelLikeRequest, res: VercelLikeResponse) => void | Promise<void>;
type HandlerModule = { default?: Handler };

function collectRoutes(apiDir: string): Route[] {
  const routes: Route[] = [];

  function walk(dir: string, urlPrefix: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_")) continue;
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const seg =
          entry.name.startsWith("[") && entry.name.endsWith("]")
            ? `:${entry.name.slice(1, -1)}`
            : entry.name;
        walk(full, urlPrefix + "/" + seg);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(ts|js|mjs)$/.test(entry.name)) continue;
      if (entry.name.endsWith(".d.ts")) continue;
      const baseName = entry.name.replace(/\.(ts|js|mjs)$/, "");
      let pattern: string;
      if (baseName === "index") {
        pattern = urlPrefix || "/";
      } else if (baseName.startsWith("[") && baseName.endsWith("]")) {
        pattern = urlPrefix + "/:" + baseName.slice(1, -1);
      } else {
        pattern = urlPrefix + "/" + baseName;
      }
      const paramNames: string[] = [];
      const regexStr = pattern.replace(/:([a-zA-Z_]+)/g, (_, n: string) => {
        paramNames.push(n);
        return "([^/]+)";
      });
      routes.push({
        pattern,
        regex: new RegExp("^" + regexStr + "/?$"),
        paramNames,
        filePath: full,
        isDynamic: pattern.includes(":"),
        segmentDepth: pattern.split("/").length,
      });
    }
  }

  walk(apiDir, "/api");
  routes.sort((a, b) => {
    if (b.segmentDepth !== a.segmentDepth) return b.segmentDepth - a.segmentDepth;
    return Number(a.isDynamic) - Number(b.isDynamic);
  });
  return routes;
}

function decorateResponse(res: ServerResponse): VercelLikeResponse {
  const decorated = res as VercelLikeResponse;
  decorated.status = function status(this: VercelLikeResponse, code: number): VercelLikeResponse {
    this.statusCode = code;
    return this;
  };
  decorated.json = function json(this: VercelLikeResponse, data: unknown): VercelLikeResponse {
    if (this.writableEnded) return this;
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(data));
    return this;
  };
  decorated.send = function send(this: VercelLikeResponse, data: unknown): VercelLikeResponse {
    if (this.writableEnded) return this;
    if (data && typeof data === "object" && !Buffer.isBuffer(data)) {
      this.setHeader("Content-Type", "application/json");
      this.end(JSON.stringify(data));
    } else if (data === undefined || data === null) {
      this.end();
    } else {
      this.end(String(data));
    }
    return this;
  };
  return decorated;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve(undefined);
      const text = Buffer.concat(chunks).toString();
      const ct = String(req.headers["content-type"] ?? "");
      if (ct.includes("application/json")) {
        try {
          resolve(JSON.parse(text));
        } catch {
          resolve(text);
        }
        return;
      }
      resolve(text);
    });
    req.on("error", () => resolve(undefined));
  });
}

function buildQuery(qs: string | undefined, pathParams: Record<string, string>): Query {
  const query: Query = { ...pathParams };
  const searchParams = new URLSearchParams(qs ?? "");
  for (const [k, v] of searchParams) {
    const existing = query[k];
    if (existing === undefined) {
      query[k] = v;
    } else if (Array.isArray(existing)) {
      existing.push(v);
    } else {
      query[k] = [existing, v];
    }
  }
  return query;
}

export function apiHandlersPlugin(apiDir: string): Plugin {
  let server: ViteDevServer | undefined;
  let routes: Route[] = [];

  return {
    name: "vite-api-handlers",
    configureServer(s: ViteDevServer) {
      server = s;
      routes = collectRoutes(apiDir);
      const summary = routes.map((r) => r.pattern).slice(0, 8).join(", ");
      s.config.logger.info(
        `[api] mounted ${routes.length} routes (${summary}${routes.length > 8 ? ", …" : ""})`,
      );

      const middleware: Connect.NextHandleFunction = async (req, res, next) => {
        const url = req.originalUrl ?? req.url ?? "";
        if (!url.startsWith("/api")) return next();
        const [pathOnly, qs] = url.split("?");

        let matched: Route | undefined;
        const pathParams: Record<string, string> = {};
        for (const r of routes) {
          const m = r.regex.exec(pathOnly);
          if (m) {
            matched = r;
            r.paramNames.forEach((n, i) => {
              pathParams[n] = decodeURIComponent(m[i + 1]);
            });
            break;
          }
        }
        if (!matched) return next();

        try {
          const mod = (await server!.ssrLoadModule(matched.filePath)) as HandlerModule;
          const handler = mod.default;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.end(`No default export in ${matched.filePath}`);
            return;
          }

          const vReq = req as VercelLikeRequest;
          vReq.query = buildQuery(qs, pathParams);
          if (req.method && req.method !== "GET" && req.method !== "HEAD") {
            vReq.body = await readBody(req);
          }
          const vRes = decorateResponse(res);

          await handler(vReq, vRes);
          if (!res.writableEnded) res.end();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[api] ${matched.pattern} failed:`, err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal server error", message }));
          }
        }
      };

      s.middlewares.use(middleware);
    },
  };
}
