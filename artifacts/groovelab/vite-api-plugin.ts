import type { Plugin, ViteDevServer } from "vite";
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

function collectRoutes(apiDir: string): Route[] {
  const routes: Route[] = [];

  function walk(dir: string, urlPrefix: string) {
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
      const regexStr = pattern.replace(/:([a-zA-Z_]+)/g, (_, n) => {
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

function makeRes(res: any) {
  let statusCode = 200;
  const wrapped: any = {
    status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return wrapped;
    },
    json(data: any) {
      if (res.writableEnded) return wrapped;
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return wrapped;
    },
    send(data: any) {
      if (res.writableEnded) return wrapped;
      res.statusCode = statusCode;
      if (data && typeof data === "object" && !Buffer.isBuffer(data)) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      } else {
        res.end(data);
      }
      return wrapped;
    },
    setHeader(name: string, val: string) {
      res.setHeader(name, val);
      return wrapped;
    },
    getHeader(name: string) {
      return res.getHeader(name);
    },
    end(data?: any) {
      if (!res.writableEnded) res.end(data);
      return wrapped;
    },
    get statusCode() {
      return statusCode;
    },
    set statusCode(v: number) {
      statusCode = v;
      res.statusCode = v;
    },
    get writableEnded() {
      return res.writableEnded;
    },
  };
  return wrapped;
}

async function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve(undefined);
      const text = Buffer.concat(chunks).toString();
      const ct = String(req.headers["content-type"] || "");
      if (ct.includes("application/json")) {
        try {
          resolve(JSON.parse(text));
          return;
        } catch {
          resolve(text);
          return;
        }
      }
      resolve(text);
    });
    req.on("error", () => resolve(undefined));
  });
}

export function apiHandlersPlugin(apiDir: string): Plugin {
  let server: ViteDevServer | undefined;
  let routes: Route[] = [];

  return {
    name: "vite-api-handlers",
    configureServer(s) {
      server = s;
      routes = collectRoutes(apiDir);
      const summary = routes.map((r) => r.pattern).slice(0, 8).join(", ");
      s.config.logger.info(
        `[api] mounted ${routes.length} routes (${summary}${routes.length > 8 ? ", …" : ""})`,
      );

      s.middlewares.use(async (req: any, res: any, next: any) => {
        const url: string = req.originalUrl || req.url || "";
        if (!url.startsWith("/api")) return next();
        const [pathOnly, qs] = url.split("?");

        let matched: Route | undefined;
        let pathParams: Record<string, string> = {};
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

        const searchParams = new URLSearchParams(qs || "");
        const query: Record<string, any> = { ...pathParams };
        for (const [k, v] of searchParams) {
          if (k in query) {
            query[k] = Array.isArray(query[k]) ? [...query[k], v] : [query[k], v];
          } else {
            query[k] = v;
          }
        }

        try {
          const mod = await server!.ssrLoadModule(matched.filePath);
          const handler = (mod as any).default;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.end(`No default export in ${matched.filePath}`);
            return;
          }

          if (req.method && req.method !== "GET" && req.method !== "HEAD") {
            req.body = await readBody(req);
          }
          (req as any).query = query;

          const wrappedRes = makeRes(res);
          await handler(req, wrappedRes);
          if (!res.writableEnded) {
            res.end();
          }
        } catch (err: any) {
          console.error(`[api] ${matched.pattern} failed:`, err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Internal server error",
                message: String(err?.message ?? err),
              }),
            );
          }
        }
      });
    },
  };
}
