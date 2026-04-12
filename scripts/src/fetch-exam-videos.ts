/**
 * Fetches real YouTube video IDs for exam play-along content.
 * Run this when YouTube API quota is available (resets daily at midnight PT).
 *
 * Usage: YOUTUBE_API_KEY=xxx pnpm --filter scripts exec tsx src/fetch-exam-videos.ts
 *
 * Output: writes to artifacts/groovelab/src/data/exam-video-ids.json
 */

import https from "https";
import fs from "fs";
import path from "path";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) { console.error("Set YOUTUBE_API_KEY"); process.exit(1); }

function ytSearch(query: string, maxResults = 3): Promise<{ id: string; title: string }[]> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      part: 'snippet', q: query, type: 'video', maxResults: String(maxResults),
      key: API_KEY!, videoDuration: 'medium', order: 'relevance',
    });
    https.get(`https://www.googleapis.com/youtube/v3/search?${params}`, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.error) { console.log(`  API error: ${j.error.message?.substring(0, 80)}`); resolve([]); return; }
          resolve((j.items || []).map((i: any) => ({ id: i.id.videoId, title: i.snippet.title })));
        } catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

const BOARDS = ['ABRSM', 'Trinity', 'Rockschool'];
const INSTRUMENTS = ['Piano', 'Guitar', 'Drums', 'Violin', 'Saxophone', 'Flute', 'Clarinet', 'Trumpet', 'Bass', 'Cello'];
const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

// Jazz standards to fetch backing tracks for
const STANDARDS = [
  'Autumn Leaves', 'Blue Bossa', 'All Of Me', 'Fly Me To The Moon', 'Summertime',
  'So What', 'Misty', 'Take Five', 'Take The A Train', 'Satin Doll',
  'All The Things You Are', 'My Funny Valentine', 'Night And Day', 'Stella By Starlight',
  'Body And Soul', 'Round Midnight', 'Giant Steps', 'Cantaloupe Island',
  'Song For My Father', 'Maiden Voyage', 'Freddie Freeloader', 'Watermelon Man',
  'Blue Monk', 'Now\'s The Time', 'Billie\'s Bounce', 'Cherokee', 'Donna Lee',
  'I Got Rhythm', 'Georgia On My Mind', 'The Girl From Ipanema', 'Wave',
  'Desafinado', 'How High The Moon', 'There Will Never Be Another You',
];

// Chord progression types
const PROGRESSIONS = [
  'ii V I jazz backing track', '12 bar blues backing track',
  'rhythm changes backing track', 'bossa nova backing track',
  'funk backing track', 'blues in Bb backing track',
  'jazz blues backing track', 'minor blues backing track',
];

async function main() {
  const result: Record<string, { id: string; title: string }[]> = {};
  let quota = 0;

  // Exam boards (most important combinations only — save quota)
  console.log('=== Fetching Exam Play-Along Videos ===');
  for (const board of BOARDS) {
    for (const inst of INSTRUMENTS.slice(0, 5)) { // Top 5 instruments
      for (const grade of ['Grade 1', 'Grade 3', 'Grade 5']) { // 3 key grades
        const query = `${board} ${grade} ${inst} play along`;
        const key = `${board}|${inst}|${grade}`;
        console.log(`[${quota}] ${key}`);
        const videos = await ytSearch(query, 2);
        if (videos.length > 0) result[key] = videos;
        quota += 100;
        if (quota >= 8000) { console.log('Stopping — quota limit'); break; }
      }
      if (quota >= 8000) break;
    }
    if (quota >= 8000) break;
  }

  // Jazz standards
  if (quota < 8000) {
    console.log('\n=== Fetching Jazz Standard Backing Tracks ===');
    for (const std of STANDARDS) {
      if (quota >= 9000) break;
      const query = `${std} jazz backing track`;
      const key = `standard|${std}`;
      console.log(`[${quota}] ${std}`);
      const videos = await ytSearch(query, 2);
      if (videos.length > 0) result[key] = videos;
      quota += 100;
    }
  }

  // Chord progressions
  if (quota < 9500) {
    console.log('\n=== Fetching Chord Progression Backing Tracks ===');
    for (const prog of PROGRESSIONS) {
      if (quota >= 9500) break;
      const key = `progression|${prog}`;
      console.log(`[${quota}] ${prog}`);
      const videos = await ytSearch(prog, 2);
      if (videos.length > 0) result[key] = videos;
      quota += 100;
    }
  }

  // Write output
  const outPath = path.join(__dirname, '../../artifacts/groovelab/src/data/exam-video-ids.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  const totalVideos = Object.values(result).reduce((sum, v) => sum + v.length, 0);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! ${Object.keys(result).length} queries, ${totalVideos} videos`);
  console.log(`Quota used: ${quota}`);
  console.log(`Output: ${outPath}`);
  console.log(`${'='.repeat(50)}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
