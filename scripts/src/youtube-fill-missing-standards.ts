/**
 * Fill missing jazz-standard backing tracks in
 * artifacts/groovelab/src/data/standards-videos.ts.
 *
 * Reads a list of standard names from /tmp/missing-standards.json (one entry
 * per name), scrapes YouTube via innertube (no API key, no quota), and
 * splices new entries into the STANDARDS_BACKING_TRACKS export — preserving
 * the file header and the STANDARDS_ORIGINAL_RECORDINGS export below it.
 *
 * Usage (from workspace root):
 *   pnpm --filter @workspace/scripts exec tsx src/youtube-fill-missing-standards.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getYouTubeFetchInit } from "./youtube-proxy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.resolve(
  __dirname,
  "../../artifacts/groovelab/src/data/standards-videos.ts"
);
const MISSING_FILE = "/tmp/missing-standards.json";
const TARGET = 5;
const args = process.argv.slice(2);
const LIMIT = parseInt(args[args.indexOf("--limit") + 1]) || 9999;

interface VideoResult {
  id: string;
  title: string;
  channel: string;
}

const INNERTUBE_CTX = {
  client: { clientName: "WEB", clientVersion: "2.20240304.00.00", hl: "en", gl: "US" },
};
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

async function searchYouTube(query: string, maxResults = 8): Promise<VideoResult[]> {
  const url = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}&prettyPrint=false`;
  const body = { context: INNERTUBE_CTX, query, params: "EgIQAQ%3D%3D" };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        ...getYouTubeFetchInit(),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://www.youtube.com/",
          Origin: "https://www.youtube.com",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      const out: VideoResult[] = [];
      const sections =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];
      for (const section of sections) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const it of items) {
          const v = it?.videoRenderer;
          if (!v?.videoId) continue;
          const title =
            v.title?.runs?.map((r: any) => r.text).join("") ||
            v.title?.simpleText ||
            "";
          const channel =
            v.ownerText?.runs?.[0]?.text ||
            v.longBylineText?.runs?.[0]?.text ||
            "";
          out.push({ id: v.videoId, title, channel });
          if (out.length >= maxResults) return out;
        }
      }
      return out;
    } catch (err: any) {
      if (attempt === 2) {
        console.error(`    search failed: ${err.message}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return [];
}

function escapeKey(name: string): string {
  return name.replace(/'/g, "\\'");
}

function renderEntries(entries: Record<string, VideoResult[]>): string {
  return Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, videos]) => {
      const lines = videos
        .map(v => {
          const title = JSON.stringify(v.title.replace(/\n/g, " "));
          const channel = JSON.stringify(v.channel);
          return `    { id: '${v.id}', title: ${title}, channel: ${channel} }`;
        })
        .join(",\n");
      return `  '${escapeKey(name)}': [\n${lines}\n  ]`;
    })
    .join(",\n");
}

function parseExistingBT(file: string): Record<string, VideoResult[]> {
  const btStart = file.indexOf("STANDARDS_BACKING_TRACKS");
  const openBrace = file.indexOf("{", btStart);
  const closeBrace = file.indexOf("\n};", openBrace);
  const block = file.slice(openBrace + 1, closeBrace);
  const result: Record<string, VideoResult[]> = {};
  const blockRegex = /^  '((?:\\'|[^'])+)':\s*\[([\s\S]*?)\n  \]/gm;
  let match;
  while ((match = blockRegex.exec(block)) !== null) {
    const name = match[1].replace(/\\'/g, "'");
    const inner = match[2];
    const videos: VideoResult[] = [];
    for (const line of inner.split("\n")) {
      const idM = /id:\s*'([^']+)'/.exec(line);
      if (!idM) continue;
      const titleM = /title:\s*("(?:[^"\\]|\\.)*")/.exec(line);
      const chanM = /channel:\s*("(?:[^"\\]|\\.)*")/.exec(line);
      if (!titleM || !chanM) continue;
      videos.push({
        id: idM[1],
        title: JSON.parse(titleM[1]),
        channel: JSON.parse(chanM[1]),
      });
    }
    result[name] = videos;
  }
  return result;
}

function writeMerged(
  originalFile: string,
  bt: Record<string, VideoResult[]>
): string {
  const btStart = originalFile.indexOf("export const STANDARDS_BACKING_TRACKS");
  const openBrace = originalFile.indexOf("{", btStart);
  const closeBrace = originalFile.indexOf("\n};", openBrace);
  const before = originalFile.slice(0, openBrace + 1);
  const after = originalFile.slice(closeBrace);
  return `${before}\n${renderEntries(bt)}\n${after}`;
}

async function main() {
  const file = fs.readFileSync(DATA_FILE, "utf-8");
  const missing: string[] = JSON.parse(fs.readFileSync(MISSING_FILE, "utf-8"));
  const bt = parseExistingBT(file);

  console.log(`Existing BT keys: ${Object.keys(bt).length}`);
  console.log(`Missing standards to fill: ${missing.length}`);
  console.log(`Target: ${TARGET} videos per standard\n`);

  const todo = missing.filter(n => (bt[n]?.length || 0) < TARGET).slice(0, LIMIT);
  console.log(`To process this run: ${todo.length}\n`);
  let processed = 0;
  let added = 0;
  for (const name of todo) {
    processed++;
    const queries = [
      `"${name}" jazz backing track play along`,
      `"${name}" jazz play-along`,
      `"${name}" jazz standard`,
    ];
    const collected: VideoResult[] = [];
    const have = new Set((bt[name] || []).map(v => v.id));
    for (const q of queries) {
      if (collected.length >= TARGET + 2) break;
      const results = await searchYouTube(q, 8);
      for (const r of results) {
        if (have.has(r.id)) continue;
        if (collected.some(c => c.id === r.id)) continue;
        collected.push(r);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    const fresh = collected.slice(0, TARGET);
    bt[name] = [...(bt[name] || []), ...fresh];
    added += fresh.length;
    console.log(`[${processed}/${missing.length}] ${name} → +${fresh.length} (total ${bt[name].length})`);

    if (processed % 5 === 0) {
      const merged = writeMerged(file, bt);
      fs.writeFileSync(DATA_FILE, merged, "utf-8");
    }
  }

  const merged = writeMerged(file, bt);
  fs.writeFileSync(DATA_FILE, merged, "utf-8");
  console.log(`\n✓ Done. Processed ${processed}, added ${added} videos.`);
  console.log(`  Total BT keys now: ${Object.keys(bt).length}`);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
