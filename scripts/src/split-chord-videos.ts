/**
 * Split the single-export /data/chord-videos.ts (36 entries) into the
 * two-export format required by the app at artifacts/groovelab/src/data/chord-videos.ts:
 *   - CHORD_PROGRESSION_VIDEOS (progressions like ii-V-I)
 *   - KEY_BACKING_TRACKS (keys like C Major)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC = path.resolve(__dirname, "../../data/chord-videos.ts");
const DEST = path.resolve(__dirname, "../../artifacts/groovelab/src/data/chord-videos.ts");

interface VideoResult { id: string; title: string; channel: string; }

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
      out += next; i += 2; continue;
    }
    if (c === quote) return out;
    out += c;
    i++;
  }
  return null;
}

const PROGRESSION_KEYS = [
  'ii-V-I', 'Blues Progression', 'Rhythm Changes', 'Modal',
  'I-vi-ii-V', 'Funk', 'Reggae', 'Latin', 'Neo Soul',
  'Afrobeat', 'Gospel', 'R&B',
];

const KEY_ORDER = [
  'C Major', 'Db Major', 'D Major', 'Eb Major', 'E Major', 'F Major',
  'Gb Major', 'G Major', 'Ab Major', 'A Major', 'Bb Major', 'B Major',
  'C Minor', 'C# Minor', 'D Minor', 'Eb Minor', 'E Minor', 'F Minor',
  'F# Minor', 'G Minor', 'Ab Minor', 'A Minor', 'Bb Minor', 'B Minor',
];

function parseFile(filepath: string): Record<string, VideoResult[]> {
  const content = fs.readFileSync(filepath, "utf-8");
  const result: Record<string, VideoResult[]> = {};
  const blockRegex = /^  '((?:\\'|[^'])+)':\s*\[([\s\S]*?)\n  \]/gm;
  let m;
  while ((m = blockRegex.exec(content)) !== null) {
    const name = m[1].replace(/\\'/g, "'");
    const videos: VideoResult[] = [];
    for (const line of m[2].split("\n")) {
      const parsed = parseVideoLine(line);
      if (parsed) videos.push(parsed);
    }
    result[name] = videos;
  }
  return result;
}

function serializeBlock(name: string, videos: VideoResult[]): string {
  const safeName = name.replace(/'/g, "\\'");
  const body = videos.map(v => {
    const title = JSON.stringify(v.title.replace(/\n/g, " "));
    const channel = JSON.stringify(v.channel);
    return `    { id: '${v.id}', title: ${title}, channel: ${channel} }`;
  }).join(",\n");
  return `  '${safeName}': [\n${body}\n  ]`;
}

function main() {
  const all = parseFile(SRC);
  const totalIn = Object.values(all).reduce((s, v) => s + v.length, 0);
  console.log(`Parsed ${Object.keys(all).length} entries / ${totalIn} videos from /data`);

  const progressions: Record<string, VideoResult[]> = {};
  const keys: Record<string, VideoResult[]> = {};

  for (const name of PROGRESSION_KEYS) {
    if (all[name]) progressions[name] = all[name];
    else console.warn(`Missing progression: ${name}`);
  }
  for (const name of KEY_ORDER) {
    if (all[name]) keys[name] = all[name];
    else console.warn(`Missing key: ${name}`);
  }

  const missedKeys = Object.keys(all).filter(k => !PROGRESSION_KEYS.includes(k) && !KEY_ORDER.includes(k));
  if (missedKeys.length) console.warn(`Unclassified keys: ${missedKeys.join(", ")}`);

  const progBlocks = PROGRESSION_KEYS
    .filter(k => progressions[k])
    .map(k => serializeBlock(k, progressions[k]))
    .join(",\n");
  const keyBlocks = KEY_ORDER
    .filter(k => keys[k])
    .map(k => serializeBlock(k, keys[k]))
    .join(",\n");

  const out = `// AUTO-GENERATED — GrooveLab Chord Progression & Key Backing Tracks Database
// Last updated: ${new Date().toISOString().split("T")[0]}

export const CHORD_PROGRESSION_VIDEOS: Record<string, { id: string; title: string; channel: string }[]> = {
${progBlocks}
};

export const KEY_BACKING_TRACKS: Record<string, { id: string; title: string; channel: string }[]> = {
${keyBlocks}
};
`;

  fs.writeFileSync(DEST, out, "utf-8");
  const progCount = Object.values(progressions).reduce((s, v) => s + v.length, 0);
  const keyCount = Object.values(keys).reduce((s, v) => s + v.length, 0);
  console.log(`✓ Wrote ${DEST}`);
  console.log(`  CHORD_PROGRESSION_VIDEOS: ${Object.keys(progressions).length} entries / ${progCount} videos`);
  console.log(`  KEY_BACKING_TRACKS: ${Object.keys(keys).length} entries / ${keyCount} videos`);
}

main();
