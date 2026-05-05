/**
 * Fill remaining exam entries using targeted queries for method-book entries
 * that don't fit the board|instrument|grade pattern.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getYouTubeFetchInit } from "./youtube-proxy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXAM_FILE = path.resolve(__dirname, "../../data/exam-video-ids.json");

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const CTX = { client: { clientName: "WEB", clientVersion: "2.20240304.00.00", hl: "en", gl: "US" } };

interface InnertubeTextRun { text: string }
interface InnertubeVideoRenderer {
  videoId?: string;
  title?: { runs?: InnertubeTextRun[]; simpleText?: string };
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

async function search(query: string, max = 10): Promise<{ id: string; title: string }[]> {
  const url = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}&prettyPrint=false`;
  const res = await fetch(url, {
    ...getYouTubeFetchInit(),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://www.youtube.com/",
    },
    body: JSON.stringify({ context: CTX, query, params: "EgIQAQ%3D%3D" }),
  });
  if (!res.ok) return [];
  const data = await res.json() as InnertubeSearchResponse;
  const out: { id: string; title: string }[] = [];
  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  for (const s of sections) {
    for (const it of s?.itemSectionRenderer?.contents || []) {
      const v = it?.videoRenderer;
      if (!v?.videoId) continue;
      const title = v.title?.runs?.map((r: InnertubeTextRun) => r.text).join("") || v.title?.simpleText || "";
      out.push({ id: v.videoId, title });
      if (out.length >= max) return out;
    }
  }
  return out;
}

// Custom queries for method-book entries
const CUSTOM_QUERIES: Record<string, string[]> = {
  "Faber Piano Adventures|Primer": [
    "Faber Piano Adventures Primer Level play along",
    "Faber Primer lesson book piano",
    "Piano Adventures Primer Faber piano tutorial",
  ],
  "Bastien Piano Basics|Primer": [
    "Bastien Piano Basics Primer Level piano play along",
    "Bastien piano primer lesson",
    "Bastien piano method primer tutorial",
  ],
  "Hanon|Exercises 1-20": [
    "Hanon virtuoso pianist exercises 1 to 20 play along",
    "Hanon piano exercises 1-20 tutorial",
    "Hanon The Virtuoso Pianist Book 1 exercises",
  ],
  "Hanon|Exercises 21-43": [
    "Hanon virtuoso pianist exercises 21 to 43",
    "Hanon piano exercises book 2 play along",
    "Hanon 21-43 tutorial piano",
  ],
  "Hanon|Exercises 44-60": [
    "Hanon virtuoso pianist exercises 44 to 60",
    "Hanon piano exercises book 3 play along",
    "Hanon 44-60 tutorial piano",
  ],
  "Czerny|Op. 849": [
    "Czerny Op 849 30 Etudes de Mecanisme piano",
    "Czerny 30 New Studies in Technics Op 849 play along",
    "Czerny op 849 etude piano performance",
  ],
  "Burgmuller|25 Progressive Studies Op. 100": [
    "Burgmuller 25 Progressive Studies Op 100 piano",
    "Burgmuller Op 100 etudes piano play along",
    "Burgmuller 25 easy progressive studies performance",
  ],
  "Burgmuller|18 Studies Op. 109": [
    "Burgmuller 18 Studies Op 109 piano",
    "Burgmuller Op 109 etudes performance",
    "Burgmuller 18 caracteristic studies piano",
  ],
  "Burgmuller|12 Brilliant Studies Op. 105": [
    "Burgmuller 12 Brilliant Studies Op 105 piano",
    "Burgmuller Op 105 etudes performance",
    "Burgmuller 12 etudes brillantes piano",
  ],
  "Bartok Mikrokosmos|Vol 1": [
    "Bartok Mikrokosmos Volume 1 piano",
    "Bartok Mikrokosmos Book 1 performance",
    "Bartok Mikrokosmos Sz 107 Vol 1 piano",
  ],
  "Bartok Mikrokosmos|Vol 2": [
    "Bartok Mikrokosmos Volume 2 piano",
    "Bartok Mikrokosmos Book 2 performance",
    "Bartok Mikrokosmos Sz 107 Vol 2 piano",
  ],
  "Bartok Mikrokosmos|Vol 3": [
    "Bartok Mikrokosmos Volume 3 piano",
    "Bartok Mikrokosmos Book 3 performance",
    "Bartok Mikrokosmos Sz 107 Vol 3 piano",
  ],
  "Bartok Mikrokosmos|Vol 4": [
    "Bartok Mikrokosmos Volume 4 piano",
    "Bartok Mikrokosmos Book 4 performance",
    "Bartok Mikrokosmos Sz 107 Vol 4 piano",
  ],
};

async function main() {
  const examData = JSON.parse(fs.readFileSync(EXAM_FILE, "utf-8")) as Record<
    string,
    { id: string; title: string }[]
  >;

  const targets = Object.keys(CUSTOM_QUERIES);
  console.log(`Filling ${targets.length} straggler entries to 3+ videos each\n`);

  let added = 0;
  for (let i = 0; i < targets.length; i++) {
    const key = targets[i];
    const have = examData[key] || [];
    const haveIds = new Set(have.map(v => v.id));
    const needed = Math.max(3 - have.length, 0);
    if (needed === 0) {
      console.log(`[${i + 1}/${targets.length}] ${key} already at ${have.length}`);
      continue;
    }
    process.stdout.write(`[${i + 1}/${targets.length}] ${key} (have ${have.length})`);
    const queries = CUSTOM_QUERIES[key];
    const collected: { id: string; title: string }[] = [];
    for (const q of queries) {
      if (collected.length >= needed + 1) break;
      const results = await search(q, 6);
      for (const r of results) {
        if (haveIds.has(r.id)) continue;
        if (collected.some(c => c.id === r.id)) continue;
        collected.push(r);
      }
      await new Promise(r => setTimeout(r, 250));
    }
    const fresh = collected.slice(0, Math.max(needed, 1));
    examData[key] = [...have, ...fresh];
    added += fresh.length;
    console.log(` → +${fresh.length} (total ${examData[key].length})`);
  }

  fs.writeFileSync(EXAM_FILE, JSON.stringify(examData, null, 2), "utf-8");

  const done = Object.values(examData).filter(v => v.length >= 3).length;
  console.log(`\n✓ Added ${added}. ${done}/${Object.keys(examData).length} at 3+ videos.`);
  const stillLow = Object.entries(examData)
    .filter(([, v]) => v.length < 3)
    .map(([k, v]) => `${k} (${v.length})`);
  if (stillLow.length) console.log(`Still low: ${stillLow.join(", ")}`);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
