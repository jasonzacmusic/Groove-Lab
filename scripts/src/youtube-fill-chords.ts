/**
 * Fill data/chord-videos.ts for entries below minimum video count.
 *
 * Uses YouTube innertube (no API key, no quota). Entries are either chord
 * progressions (ii-V-I, Rhythm Changes) or keys (C Major, D Minor), and
 * each gets key-appropriate query templates.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../../data/chord-videos.ts");

const args = process.argv.slice(2);
const minVideos = parseInt(args[args.indexOf("--min") + 1]) || 5;
const entryLimit = parseInt(args[args.indexOf("--limit") + 1]) || 9999;

interface VideoResult {
  id: string;
  title: string;
  channel: string;
}

interface InnertubeTextRun { text: string }
interface InnertubeOwnerRun { text: string }
interface InnertubeVideoRenderer {
  videoId?: string;
  title?: { runs?: InnertubeTextRun[]; simpleText?: string };
  ownerText?: { runs?: InnertubeOwnerRun[] };
  longBylineText?: { runs?: InnertubeOwnerRun[] };
}
interface InnertubeItemContent { videoRenderer?: InnertubeVideoRenderer }
interface InnertubeSection {
  itemSectionRenderer?: { contents?: InnertubeItemContent[] };
}
interface InnertubeSearchResponse {
  contents?: {
    twoColumnSearchResultsRenderer?: {
      primaryContents?: {
        sectionListRenderer?: { contents?: InnertubeSection[] };
      };
    };
  };
}

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const CTX = { client: { clientName: "WEB", clientVersion: "2.20240304.00.00", hl: "en", gl: "US" } };

async function search(query: string, max = 10): Promise<VideoResult[]> {
  let attempt = 0;
  while (attempt < 3) {
    try {
      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}&prettyPrint=false`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Referer: "https://www.youtube.com/",
          },
          body: JSON.stringify({ context: CTX, query, params: "EgIQAQ%3D%3D" }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as InnertubeSearchResponse;
      const out: VideoResult[] = [];
      const sections =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];
      for (const s of sections) {
        for (const it of s?.itemSectionRenderer?.contents || []) {
          const v = it?.videoRenderer;
          if (!v?.videoId) continue;
          const title =
            v.title?.runs?.map((r: InnertubeTextRun) => r.text).join("") ||
            v.title?.simpleText ||
            "";
          const channel =
            v.ownerText?.runs?.[0]?.text ||
            v.longBylineText?.runs?.[0]?.text ||
            "";
          out.push({ id: v.videoId, title, channel });
          if (out.length >= max) return out;
        }
      }
      return out;
    } catch (err: unknown) {
      attempt++;
      if (attempt >= 3) return [];
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  return [];
}

// Parse helpers identical to the standards script ──────────────────────
function parseVideoLine(line: string): VideoResult | null {
  const idMatch = /id:\s*'([^']+)'/.exec(line);
  if (!idMatch) return null;
  const title = extractQuotedField(line, "title");
  if (title === null) return null;
  const channel = extractQuotedField(line, "channel");
  if (channel === null) return null;
  return { id: idMatch[1], title, channel };
}

function extractQuotedField(line: string, field: string): string | null {
  const idx = line.indexOf(`${field}:`);
  if (idx < 0) return null;
  let i = idx + field.length + 1;
  while (i < line.length && line[i] === " ") i++;
  const quote = line[i];
  if (quote !== "'" && quote !== '"') return null;
  i++;
  let out = "";
  while (i < line.length) {
    const c = line[i];
    if (c === "\\" && i + 1 < line.length) {
      const next = line[i + 1];
      if (next === "u" && i + 5 < line.length) {
        const code = parseInt(line.slice(i + 2, i + 6), 16);
        if (!isNaN(code)) { out += String.fromCharCode(code); i += 6; continue; }
      }
      if (next === "n") { out += "\n"; i += 2; continue; }
      if (next === "t") { out += "\t"; i += 2; continue; }
      out += next;
      i += 2;
      continue;
    }
    if (c === quote) return out;
    out += c;
    i++;
  }
  return null;
}

function parseFile(): Record<string, VideoResult[]> {
  const content = fs.readFileSync(DATA_FILE, "utf-8");
  const result: Record<string, VideoResult[]> = {};
  const blockRegex = /^  '((?:\\'|[^'])+)':\s*\[([\s\S]*?)\n  \]/gm;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const name = match[1].replace(/\\'/g, "'");
    const videos: VideoResult[] = [];
    for (const line of match[2].split("\n")) {
      const parsed = parseVideoLine(line);
      if (parsed) videos.push(parsed);
    }
    result[name] = videos;
  }
  return result;
}

function writeFile(data: Record<string, VideoResult[]>) {
  const total = Object.values(data).reduce((s, v) => s + v.length, 0);
  if (total < 50) throw new Error(`Refusing to write: only ${total} videos`);

  // Preserve original insertion order (not alphabetical) by reading current order
  const original = fs.readFileSync(DATA_FILE, "utf-8");
  const order: string[] = [];
  const re = /^  '((?:\\'|[^'])+)':\s*\[/gm;
  let m;
  while ((m = re.exec(original)) !== null) order.push(m[1].replace(/\\'/g, "'"));
  // Append any new keys at end
  for (const k of Object.keys(data)) if (!order.includes(k)) order.push(k);

  const entries = order
    .filter(k => data[k])
    .map(name => {
      const videoEntries = data[name]
        .map(v => {
          const title = JSON.stringify(v.title.replace(/\n/g, " "));
          const channel = JSON.stringify(v.channel);
          return `    { id: '${v.id}', title: ${title}, channel: ${channel} }`;
        })
        .join(",\n");
      const safeName = name.replace(/'/g, "\\'");
      return `  '${safeName}': [\n${videoEntries}\n  ]`;
    })
    .join(",\n");

  const content = `// AUTO-GENERATED — GrooveLab Chord Progression & Key Backing Tracks Database
// Last updated: ${new Date().toISOString().split("T")[0]}

export const CHORD_PROGRESSION_VIDEOS: Record<string, { id: string; title: string; channel: string }[]> = {
${entries}
};
`;
  fs.writeFileSync(DATA_FILE, content, "utf-8");
}

// Query generator: chooses templates based on entry type
function queriesFor(name: string): string[] {
  // Progressions — already mostly filled; generic jazz/backing queries
  if (/^(ii-V-I|I-vi-ii-V|Blues Progression|Rhythm Changes|Modal|Funk|Reggae|Latin|Neo Soul|Afrobeat|Gospel|R&B)$/.test(name)) {
    return [
      `${name} backing track jazz play along`,
      `${name} chord progression backing track`,
      `${name} guitar backing track`,
    ];
  }
  // Keys: "C Major", "D Minor", "C# Minor", etc.
  const keyMatch = /^([A-G][b#]?)\s+(Major|Minor)$/.exec(name);
  if (keyMatch) {
    const key = keyMatch[1];
    const quality = keyMatch[2].toLowerCase();
    return [
      `${key} ${quality} backing track`,
      `${key} ${quality} jazz backing track play along`,
      `backing track in ${key} ${quality}`,
      `${key} ${quality} guitar backing track`,
    ];
  }
  // Fallback
  return [
    `${name} backing track play along`,
    `${name} jazz backing track`,
    `${name} chord progression`,
  ];
}

async function main() {
  console.log("=== YouTube Scrape Search: Chord Progressions & Keys ===");
  const existing = parseFile();
  const all = Object.keys(existing);
  const needs = all.filter(n => (existing[n]?.length || 0) < minVideos);

  console.log(`Total: ${all.length}`);
  console.log(`Need more: ${needs.length}`);
  console.log(`Target: ${minVideos}/entry\n`);

  const batch = needs.slice(0, entryLimit);
  let processed = 0;
  let added = 0;

  for (const name of batch) {
    processed++;
    const have = existing[name] || [];
    const haveIds = new Set(have.map(v => v.id));
    const need = minVideos - have.length;

    process.stdout.write(
      `[${processed}/${batch.length}] ${name} (have ${have.length}, need ${need})`
    );

    const queries = queriesFor(name);
    const collected: VideoResult[] = [];
    for (const q of queries) {
      if (collected.length >= need + 2) break;
      const results = await search(q, 8);
      for (const r of results) {
        if (haveIds.has(r.id)) continue;
        if (collected.some(c => c.id === r.id)) continue;
        collected.push(r);
      }
      await new Promise(r => setTimeout(r, 250));
    }

    const fresh = collected.slice(0, Math.max(need, 2));
    existing[name] = [...have, ...fresh];
    added += fresh.length;
    console.log(` → +${fresh.length} (total ${existing[name].length})`);

    if (processed % 10 === 0) writeFile(existing);
  }

  writeFile(existing);
  const filled = all.filter(n => (existing[n]?.length || 0) >= minVideos).length;
  console.log(
    `\n✓ Added ${added}. ${filled}/${all.length} at ${minVideos}+ videos.`
  );
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
