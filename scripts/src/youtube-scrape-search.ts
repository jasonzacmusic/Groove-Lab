/**
 * YouTube Scrape Search — No API key, no quota.
 *
 * Uses YouTube's internal "innertube" endpoint (the same one youtube.com uses
 * from the browser). No API key needed, no daily quota cap.
 *
 * Fills:
 *   - data/standards-videos.ts  (jazz standards → backing tracks)
 *   - data/exam-video-ids.json  (exam board/instrument/grade → play-alongs)
 *
 * Usage:
 *   cd scripts
 *   npx tsx src/youtube-scrape-search.ts               # standards
 *   npx tsx src/youtube-scrape-search.ts --exam        # exam entries
 *   npx tsx src/youtube-scrape-search.ts --min 5       # target videos per entry
 *   npx tsx src/youtube-scrape-search.ts --limit 50    # cap entries this run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.resolve(__dirname, "../../data/standards-videos.ts");
const EXAM_FILE = path.resolve(__dirname, "../../data/exam-video-ids.json");
const MASTER_FILE = path.resolve(__dirname, "../../data/jazz-standards-master.json");

const args = process.argv.slice(2);
const mode = args.includes("--exam") ? "exam" : "standards";
const minVideos = parseInt(args[args.indexOf("--min") + 1]) || 5;
const entryLimit = parseInt(args[args.indexOf("--limit") + 1]) || 9999;

interface VideoResult {
  id: string;
  title: string;
  channel: string;
}

// Innertube client context — matches what youtube.com sends
const INNERTUBE_CTX = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240304.00.00",
    hl: "en",
    gl: "US",
  },
};

// Public innertube API key — this is published in youtube.com's HTML and used
// by every browser request. It is NOT a billed Google Cloud key and has no quota.
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

// ── Scrape search via innertube ─────────────────────────────────────────
async function searchYouTube(query: string, maxResults = 10): Promise<VideoResult[]> {
  const url = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}&prettyPrint=false`;
  const body = {
    context: INNERTUBE_CTX,
    query,
    params: "EgIQAQ%3D%3D", // filter: video only
  };

  let attempt = 0;
  while (attempt < 3) {
    try {
      const res = await fetch(url, {
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
      const data = await res.json();
      return extractResults(data, maxResults);
    } catch (err: any) {
      attempt++;
      if (attempt >= 3) {
        console.error(`    search failed: ${err.message}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  return [];
}

function extractResults(data: any, maxResults: number): VideoResult[] {
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
}

// Parse one video line tolerating both quote styles and escaped quotes
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
        if (!isNaN(code)) {
          out += String.fromCharCode(code);
          i += 6;
          continue;
        }
      }
      if (next === "n") { out += "\n"; i += 2; continue; }
      if (next === "t") { out += "\t"; i += 2; continue; }
      if (next === "'" || next === '"' || next === "\\") {
        out += next;
        i += 2;
        continue;
      }
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

// ── Parse existing standards-videos.ts ──────────────────────────────────
function parseExistingStandards(): Record<string, VideoResult[]> {
  if (!fs.existsSync(DATA_FILE)) return {};
  const content = fs.readFileSync(DATA_FILE, "utf-8");
  const result: Record<string, VideoResult[]> = {};

  // Match top-level keys: start-of-line, 2 spaces, single-quoted key allowing \' escapes
  const blockRegex = /^  '((?:\\'|[^'])+)':\s*\[([\s\S]*?)\n  \]/gm;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const name = match[1].replace(/\\'/g, "'");
    const block = match[2];
    const videos: VideoResult[] = [];
    // Each video is one line: { id: '...', title: '...'|"...", channel: '...'|"..." }
    for (const line of block.split("\n")) {
      const parsed = parseVideoLine(line);
      if (parsed) videos.push(parsed);
    }
    result[name] = videos;
  }
  return result;
}

function writeStandardsFile(data: Record<string, VideoResult[]>) {
  const totalVideos = Object.values(data).reduce((s, v) => s + v.length, 0);
  if (totalVideos < 100) {
    throw new Error(
      `Refusing to write: only ${totalVideos} videos parsed — likely parser bug`
    );
  }
  const entries = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, videos]) => {
      const videoEntries = videos
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

  const content = `// AUTO-GENERATED — GrooveLab Jazz Standards Backing Tracks Database
// Last updated: ${new Date().toISOString().split("T")[0]}
// Source: YouTube innertube search (no API key, no quota)

export const STANDARDS_BACKING_TRACKS: Record<string, { id: string; title: string; channel: string }[]> = {
${entries}
};
`;
  fs.writeFileSync(DATA_FILE, content, "utf-8");
}

// ── Standards mode ──────────────────────────────────────────────────────
async function runStandards() {
  console.log("=== YouTube Scrape Search: Jazz Standards ===");

  const existing = parseExistingStandards();
  const allNames = new Set(Object.keys(existing));

  if (fs.existsSync(MASTER_FILE)) {
    const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
    for (const s of master.standards || []) allNames.add(s.title);
  }

  const allStandards = Array.from(allNames).sort();
  const needs = allStandards.filter(
    n => (existing[n]?.length || 0) < minVideos
  );

  console.log(`Total standards: ${allStandards.length}`);
  console.log(`Need more videos: ${needs.length}`);
  console.log(`Target: ${minVideos}/standard\n`);

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

    const queries = [
      `"${name}" jazz backing track play along`,
      `"${name}" jazz play-along`,
      `"${name}" jazz standard`,
    ];

    const collected: VideoResult[] = [];
    for (const q of queries) {
      if (collected.length + have.length >= minVideos + 3) break;
      const results = await searchYouTube(q, 8);
      for (const r of results) {
        if (haveIds.has(r.id)) continue;
        if (collected.some(c => c.id === r.id)) continue;
        collected.push(r);
      }
      await new Promise(r => setTimeout(r, 250));
    }

    const fresh = collected.slice(0, Math.max(need, 3));
    existing[name] = [...have, ...fresh];
    added += fresh.length;
    console.log(` → +${fresh.length} (total ${existing[name].length})`);

    // Save every 10 entries for resumability
    if (processed % 10 === 0) writeStandardsFile(existing);
  }

  writeStandardsFile(existing);

  const filled = allStandards.filter(n => (existing[n]?.length || 0) >= minVideos).length;
  console.log(
    `\n✓ Done. Processed ${processed}, added ${added} videos. ${filled}/${allStandards.length} at ${minVideos}+ videos.`
  );
}

// ── Exam mode ───────────────────────────────────────────────────────────
async function runExam() {
  console.log("=== YouTube Scrape Search: Exam Play-Alongs ===");

  const examData = JSON.parse(fs.readFileSync(EXAM_FILE, "utf-8")) as Record<
    string,
    { id: string; title: string }[]
  >;
  const keys = Object.keys(examData);
  const needs = keys.filter(k => (examData[k]?.length || 0) < minVideos);

  console.log(`Total entries: ${keys.length}`);
  console.log(`Need videos: ${needs.length}\n`);

  const batch = needs.slice(0, entryLimit);
  let processed = 0;
  let added = 0;

  for (const key of batch) {
    processed++;
    const [board, instrument, grade] = key.split("|");
    const have = examData[key] || [];
    const haveIds = new Set(have.map(v => v.id));

    process.stdout.write(`[${processed}/${batch.length}] ${key}`);

    const queries = [
      `${board} ${grade} ${instrument} backing track play along`,
      `${board} ${grade} ${instrument} exam pieces`,
      `${grade} ${instrument} ${board} performance`,
    ];

    const collected: { id: string; title: string }[] = [];
    for (const q of queries) {
      if (collected.length + have.length >= minVideos + 2) break;
      const results = await searchYouTube(q, 6);
      for (const r of results) {
        if (haveIds.has(r.id)) continue;
        if (collected.some(c => c.id === r.id)) continue;
        collected.push({ id: r.id, title: r.title });
      }
      await new Promise(r => setTimeout(r, 250));
    }

    const fresh = collected.slice(0, Math.max(minVideos - have.length, 3));
    examData[key] = [...have, ...fresh];
    added += fresh.length;
    console.log(` → +${fresh.length} (total ${examData[key].length})`);

    if (processed % 10 === 0) {
      fs.writeFileSync(EXAM_FILE, JSON.stringify(examData, null, 2), "utf-8");
    }
  }

  fs.writeFileSync(EXAM_FILE, JSON.stringify(examData, null, 2), "utf-8");

  const filled = keys.filter(k => (examData[k]?.length || 0) >= minVideos).length;
  console.log(
    `\n✓ Done. Processed ${processed}, added ${added} videos. ${filled}/${keys.length} at ${minVideos}+ videos.`
  );
}

if (mode === "exam") {
  runExam().catch(e => {
    console.error("FATAL:", e);
    process.exit(1);
  });
} else {
  runStandards().catch(e => {
    console.error("FATAL:", e);
    process.exit(1);
  });
}
