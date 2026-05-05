/**
 * YouTube Batch Search — Populates standards-videos.ts with real video IDs.
 *
 * Uses YouTube Data API v3 to search for backing tracks and great recordings
 * for each jazz standard that doesn't have enough curated videos yet.
 *
 * Quota: 10,000 units/day. Each search = 100 units = 100 searches/day.
 * Run daily until all standards are covered.
 *
 * Usage:
 *   cd scripts
 *   export YOUTUBE_API_KEY=your_key_here
 *   npx tsx src/youtube-batch-search.ts [--max-searches 50] [--min-videos 5]
 *
 * Output: Updates /home/runner/workspace/data/standards-videos.ts in place.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getYouTubeFetchInit } from "./youtube-proxy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("Set YOUTUBE_API_KEY environment variable");
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, "../../data/standards-videos.ts");
const EXAM_FILE = path.resolve(__dirname, "../../data/exam-video-ids.json");

// Parse command line args
const args = process.argv.slice(2);
const maxSearches = parseInt(args[args.indexOf('--max-searches') + 1]) || 80;
const minVideos = parseInt(args[args.indexOf('--min-videos') + 1]) || 5;
const mode = args.includes('--exam') ? 'exam' : 'standards';

interface VideoResult {
  id: string;
  title: string;
  channel: string;
}

interface YouTubeApiError {
  error?: { errors?: Array<{ reason: string }>; message?: string };
}

interface YouTubeApiSearchResponse {
  items?: Array<{
    id: { videoId: string };
    snippet: { title: string; channelTitle: string };
  }>;
}

// ── YouTube API Search ──────────────────────────────────────────────────
async function searchYouTube(query: string, maxResults: number = 5): Promise<VideoResult[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    videoCategoryId: '10', // Music category
    key: API_KEY!,
  });

  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;

  try {
    const res = await fetch(url, getYouTubeFetchInit());
    if (!res.ok) {
      const err = await res.json() as YouTubeApiError;
      if (err.error?.errors?.[0]?.reason === 'quotaExceeded' || err.error?.errors?.[0]?.reason === 'rateLimitExceeded') {
        console.error('\n*** YOUTUBE QUOTA EXCEEDED ***');
        throw new Error('QUOTA_EXCEEDED');
      }
      console.error(`  API error: ${res.status} ${JSON.stringify(err.error?.message ?? err)}`);
      return [];
    }

    const data = await res.json() as YouTubeApiSearchResponse;
    return (data.items ?? []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>'),
      channel: item.snippet.channelTitle,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Fetch error: ${msg}`);
    return [];
  }
}

// ── Parse existing standards-videos.ts ──────────────────────────────────
function parseExistingStandards(): Record<string, VideoResult[]> {
  if (!fs.existsSync(DATA_FILE)) return {};

  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  const result: Record<string, VideoResult[]> = {};

  // Match each standard entry: 'Name': [ ... ]
  const blockRegex = /'([^']+)':\s*\[([\s\S]*?)\]/g;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const name = match[1];
    const block = match[2];
    const videos: VideoResult[] = [];

    const entryRegex = /\{\s*id:\s*'([^']+)',\s*title:\s*'([^']*)',\s*channel:\s*'([^']*)'\s*\}/g;
    let entryMatch;
    while ((entryMatch = entryRegex.exec(block)) !== null) {
      videos.push({ id: entryMatch[1], title: entryMatch[2], channel: entryMatch[3] });
    }
    // Also match double-quoted strings
    const entryRegex2 = /\{\s*id:\s*'([^']+)',\s*title:\s*"([^"]*)",\s*channel:\s*'([^']*)'\s*\}/g;
    while ((entryMatch = entryRegex2.exec(block)) !== null) {
      videos.push({ id: entryMatch[1], title: entryMatch[2], channel: entryMatch[3] });
    }

    result[name] = videos;
  }

  return result;
}

// ── Write standards-videos.ts ───────────────────────────────────────────
function writeStandardsFile(data: Record<string, VideoResult[]>) {
  const entries = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, videos]) => {
      const videoEntries = videos.map(v => {
        const safeTitle = v.title.replace(/'/g, "\\'").replace(/\n/g, ' ');
        const safeChannel = v.channel.replace(/'/g, "\\'");
        return `    { id: '${v.id}', title: '${safeTitle}', channel: '${safeChannel}' }`;
      }).join(',\n');
      const safeName = name.replace(/'/g, "\\'");
      return `  '${safeName}': [\n${videoEntries}\n  ]`;
    })
    .join(',\n');

  const content = `// AUTO-GENERATED — GrooveLab Jazz Standards Backing Tracks Database
// Generated by youtube-batch-search.ts
// Last updated: ${new Date().toISOString().split('T')[0]}
// Standards with empty arrays = data pending (YouTube quota exhausted)
// Re-run search scripts to populate when quota resets

export const STANDARDS_BACKING_TRACKS: Record<string, { id: string; title: string; channel: string }[]> = {
${entries}
};
`;

  fs.writeFileSync(DATA_FILE, content, 'utf-8');
}

// ── Get list of all standards from the database ─────────────────────────
async function getStandardsFromDb(): Promise<string[]> {
  // Read the existing file for standard names, or use the database
  // For now, we'll use the existing standards-videos.ts names plus any from
  // the jazz-standards-master.json
  const masterFile = path.resolve(__dirname, "../../data/jazz-standards-master.json");
  const names = new Set<string>();

  // From existing video file
  const existing = parseExistingStandards();
  for (const name of Object.keys(existing)) {
    names.add(name);
  }

  // From master JSON
  if (fs.existsSync(masterFile)) {
    const master = JSON.parse(fs.readFileSync(masterFile, 'utf-8'));
    for (const s of (master.standards || [])) {
      names.add(s.title);
    }
  }

  return Array.from(names).sort();
}

// ── Main: Standards Mode ────────────────────────────────────────────────
async function runStandards() {
  console.log('=== YouTube Batch Search: Jazz Standards ===');
  console.log(`Max searches: ${maxSearches} (quota cost: ${maxSearches * 100} units)`);
  console.log(`Min videos per standard: ${minVideos}`);

  const allStandards = await getStandardsFromDb();
  const existing = parseExistingStandards();

  console.log(`Total standards: ${allStandards.length}`);
  console.log(`Already have videos: ${Object.keys(existing).filter(k => existing[k].length >= minVideos).length}`);

  // Find standards that need more videos
  const needsVideos = allStandards.filter(name => {
    const videos = existing[name] || [];
    return videos.length < minVideos;
  });

  console.log(`Standards needing videos: ${needsVideos.length}`);
  const batch = needsVideos.slice(0, Math.floor(maxSearches / 2)); // 2 searches per standard
  console.log(`Processing this batch: ${batch.length} standards (${batch.length * 2} searches)\n`);

  let searchCount = 0;
  let videosAdded = 0;

  for (const name of batch) {
    const existingVideos = existing[name] || [];
    const existingIds = new Set(existingVideos.map(v => v.id));
    const needed = minVideos - existingVideos.length;

    if (needed <= 0) continue;

    try {

    console.log(`  Searching: ${name} (have ${existingVideos.length}, need ${needed} more)`);

    // Search 1: Backing tracks
    const backingResults = await searchYouTube(
      `"${name}" jazz backing track play along`,
      Math.min(needed + 2, 5)
    );
    searchCount++;

    // Search 2: Original recordings / great performances
    const greatsResults = await searchYouTube(
      `"${name}" jazz original recording classic`,
      Math.min(3, 5)
    );
    searchCount++;

    // Merge, deduplicate
    const allResults = [...backingResults, ...greatsResults]
      .filter(v => !existingIds.has(v.id));

    // Remove duplicates by ID
    const seen = new Set<string>();
    const unique = allResults.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    const newVideos = [...existingVideos, ...unique.slice(0, Math.max(needed, 3))];
    existing[name] = newVideos;
    videosAdded += newVideos.length - existingVideos.length;

    console.log(`    Found ${unique.length} new videos, total now: ${newVideos.length}`);

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'QUOTA_EXCEEDED') {
        console.log('\n  Quota exceeded — saving what we have so far...');
        break;
      }
      console.error(`  Error processing ${name}: ${errMsg}`);
    }

    // Rate limit: 100ms between requests
    await new Promise(r => setTimeout(r, 100));

    if (searchCount >= maxSearches) {
      console.log(`\n  Reached max searches (${maxSearches}). Saving and stopping.`);
      break;
    }
  }

  // Write back
  writeStandardsFile(existing);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`BATCH COMPLETE`);
  console.log(`  Searches used: ${searchCount} (quota: ${searchCount * 100} / 10,000)`);
  console.log(`  Videos added: ${videosAdded}`);
  console.log(`  Standards with ${minVideos}+ videos: ${Object.values(existing).filter(v => v.length >= minVideos).length} / ${allStandards.length}`);
  console.log(`${'='.repeat(60)}`);

  if (needsVideos.length > batch.length) {
    console.log(`\n  ${needsVideos.length - batch.length} standards still need videos. Run again tomorrow.`);
  } else {
    console.log(`\n  ALL STANDARDS COVERED!`);
  }
}

// ── Main: Exam Mode ─────────────────────────────────────────────────────
async function runExam() {
  console.log('=== YouTube Batch Search: Exam Play-Alongs ===');

  if (!fs.existsSync(EXAM_FILE)) {
    console.error(`Exam file not found: ${EXAM_FILE}`);
    process.exit(1);
  }

  const examData = JSON.parse(fs.readFileSync(EXAM_FILE, 'utf-8')) as Record<string, { id: string; title: string }[]>;
  const keys = Object.keys(examData);

  console.log(`Total exam entries: ${keys.length}`);

  const needsVideos = keys.filter(k => examData[k].length === 0);
  console.log(`Entries needing videos: ${needsVideos.length}`);

  const batch = needsVideos.slice(0, maxSearches);
  console.log(`Processing this batch: ${batch.length} entries\n`);

  let searchCount = 0;
  let videosAdded = 0;

  for (const key of batch) {
    const [board, instrument, grade] = key.split('|');
    const query = `${board} ${grade} ${instrument} backing track play along`;

    console.log(`  Searching: ${key}`);

    const results = await searchYouTube(query, 3);
    searchCount++;

    if (results.length > 0) {
      examData[key] = results.map(v => ({ id: v.id, title: v.title }));
      videosAdded += results.length;
      console.log(`    Found ${results.length} videos`);
    } else {
      console.log(`    No results`);
    }

    await new Promise(r => setTimeout(r, 100));

    if (searchCount >= maxSearches) {
      console.log(`\n  Reached max searches. Saving and stopping.`);
      break;
    }
  }

  fs.writeFileSync(EXAM_FILE, JSON.stringify(examData, null, 2), 'utf-8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`BATCH COMPLETE`);
  console.log(`  Searches used: ${searchCount} (quota: ${searchCount * 100} / 10,000)`);
  console.log(`  Videos added: ${videosAdded}`);
  console.log(`  Entries with videos: ${Object.values(examData).filter(v => v.length > 0).length} / ${keys.length}`);
  console.log(`${'='.repeat(60)}`);
}

// ── Run ─────────────────────────────────────────────────────────────────
if (mode === 'exam') {
  runExam().catch(e => { console.error("FATAL:", e); process.exit(1); });
} else {
  runStandards().catch(e => { console.error("FATAL:", e); process.exit(1); });
}
