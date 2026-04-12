import pg from "pg";
import https from "https";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL!;
const API_KEY = process.env.YOUTUBE_API_KEY!;
if (!DATABASE_URL || !API_KEY) { console.error("Set DATABASE_URL and YOUTUBE_API_KEY"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// ── Title Filters ──

const ACCEPT_KEYWORDS = [
  'loop', 'backing track', 'play along', 'play-along', 'jam track',
  'drum track', 'groove', 'bpm', 'backing', 'drumless', 'minus drums',
  'minus one', 'click track', 'practice track',
];

const REJECT_KEYWORDS = [
  'tutorial', 'lesson', 'review', 'how to', 'beginner', 'exercise',
  'workout', 'fastest', 'solo', 'cover', 'reaction', 'unboxing',
  'interview', 'comparison', 'vs ', 'challenge', 'asmr', 'setup',
  'gear tour', 'drum cam', 'live concert',
];

function isAcceptableTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (REJECT_KEYWORDS.some(k => t.includes(k))) return false;
  if (ACCEPT_KEYWORDS.some(k => t.includes(k))) return true;
  return false;
}

// ── BPM and Time Sig extraction ──

function extractBpm(text: string): number | null {
  const m = text.match(/(\d{2,3})\s*bpm/i);
  if (m) {
    const bpm = parseInt(m[1]);
    if (bpm >= 30 && bpm <= 300) return bpm;
  }
  return null;
}

function extractTimeSignature(text: string): string | null {
  const m = text.match(/(\d)\/(\d)/);
  if (m) return `${m[1]}/${m[2]}`;
  if (/waltz/i.test(text)) return '3/4';
  if (/shuffle|12\/8/i.test(text)) return '12/8';
  return null;
}

// ── Genre detection ──

const GENRE_MAP: Record<string, string[]> = {
  Jazz: ['jazz', 'swing', 'bebop', 'modal'],
  Blues: ['blues', '12 bar', '12-bar'],
  Funk: ['funk', 'funky'],
  'Neo-Soul': ['neo soul', 'neo-soul', 'neosoul'],
  'R&B': ['r&b', 'rnb', 'r and b'],
  Gospel: ['gospel'],
  Rock: ['rock', 'classic rock'],
  Pop: ['pop'],
  Latin: ['latin', 'salsa', 'mambo'],
  'Bossa Nova': ['bossa nova', 'bossa'],
  Afrobeat: ['afrobeat', 'afro beat', 'afro-beat'],
  Reggae: ['reggae', 'dub'],
  'Hip-Hop': ['hip hop', 'hip-hop', 'hiphop', 'trap'],
  Country: ['country'],
  Metal: ['metal', 'heavy'],
};

function detectGenres(text: string): string[] {
  const t = text.toLowerCase();
  const genres: string[] = [];
  for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
    if (keywords.some(k => t.includes(k))) genres.push(genre);
  }
  return genres;
}

// ── Feel detection ──

const FEEL_MAP: Record<string, string[]> = {
  Straight: ['straight', '4/4', 'rock', 'pop'],
  Swing: ['swing', 'swung', 'jazz'],
  Shuffle: ['shuffle'],
  'Half-Time': ['half time', 'half-time', 'halftime'],
  Syncopated: ['syncopated', 'funk'],
  'Ghost Note Heavy': ['ghost note', 'ghost notes'],
};

function detectFeels(text: string): string[] {
  const t = text.toLowerCase();
  const feels: string[] = [];
  for (const [feel, keywords] of Object.entries(FEEL_MAP)) {
    if (keywords.some(k => t.includes(k))) feels.push(feel);
  }
  return feels.length > 0 ? feels : ['Straight'];
}

// ── Duration parsing ──

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0');
}

// ── YouTube API helpers ──

function ytGet(endpoint: string, params: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ ...params, key: API_KEY }).toString();
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${qs}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('JSON parse error')); }
      });
    }).on('error', reject);
  });
}

// ── Quality score ──

function qualityScore(views: number, likes: number, embeddable: boolean, durSec: number, subs: number): number {
  return Math.min(1,
    (Math.log10(views + 1) / 6) * 0.3 +
    (Math.log10(likes + 1) / 5) * 0.2 +
    (embeddable ? 0.2 : 0) +
    (Math.min(durSec, 1800) / 1800) * 0.15 +
    (Math.log10(subs + 1) / 7) * 0.15
  );
}

// ── Search queries ──

const QUERIES = [
  'drum loop 4/4 straight BPM',
  'drum loop swing jazz BPM',
  'drum loop shuffle blues BPM',
  'drum loop bossa nova BPM',
  'drum loop funk groove BPM',
  'drum loop neo soul BPM',
  'drum loop reggae BPM',
  'drum loop afrobeat BPM',
  'drum loop 3/4 waltz BPM',
  'drum loop 6/8 BPM',
  'drum loop 5/4 BPM',
  'drum loop 7/8 BPM',
  'jazz backing track ii V I',
  'jazz backing track Autumn Leaves',
  'jazz backing track blues in Bb',
  'blues backing track 12 bar',
  'funk drumless backing track',
  'latin percussion loop salsa',
  'bossa nova backing track',
  'gospel drum loop',
  '20 minute drum loop',
  'drumless jazz backing track',
  'play along backing track piano',
  'ABRSM grade piano play along',
  'Trinity grade piano play along',
];

// ── Taxonomy ID cache ──

const taxCache: Record<string, Record<string, number>> = {};

async function loadTaxonomy() {
  const ts = await pool.query('SELECT id, display_name FROM time_signatures');
  taxCache.timeSig = {};
  ts.rows.forEach((r: any) => { taxCache.timeSig[r.display_name] = r.id; });

  const g = await pool.query('SELECT id, name FROM genres');
  taxCache.genre = {};
  g.rows.forEach((r: any) => { taxCache.genre[r.name] = r.id; });

  const f = await pool.query('SELECT id, name FROM feels');
  taxCache.feel = {};
  f.rows.forEach((r: any) => { taxCache.feel[r.name] = r.id; });

  const ct = await pool.query('SELECT id, name FROM content_types');
  taxCache.content = {};
  ct.rows.forEach((r: any) => { taxCache.content[r.name] = r.id; });
}

// ── Main ──

async function main() {
  await loadTaxonomy();
  console.log('Taxonomy loaded');

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalApiCalls = 0;
  let quotaUsed = 0;

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const query = QUERIES[qi];
    console.log(`\n[${qi + 1}/${QUERIES.length}] Searching: "${query}"`);

    // Search
    const searchRes = await ytGet('search', {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '15',
      videoDuration: 'medium', // 4-20 min
      order: 'relevance',
    });
    totalApiCalls++;
    quotaUsed += 100;

    if (!searchRes.items || searchRes.items.length === 0) {
      console.log('  No results');
      continue;
    }

    // Get video IDs
    const videoIds = searchRes.items.map((i: any) => i.id.videoId).filter(Boolean);
    if (videoIds.length === 0) continue;

    // Fetch video details
    const videoRes = await ytGet('videos', {
      part: 'snippet,contentDetails,statistics,status',
      id: videoIds.join(','),
    });
    totalApiCalls++;
    quotaUsed += 1;

    if (!videoRes.items) continue;

    let insertedThisQuery = 0;
    let skippedThisQuery = 0;

    for (const video of videoRes.items) {
      const title = video.snippet.title;
      const desc = video.snippet.description || '';
      const fullText = title + ' ' + desc;

      // Title filter
      if (!isAcceptableTitle(title)) {
        skippedThisQuery++;
        continue;
      }

      // Duration filter (60s - 1800s)
      const durSec = parseDuration(video.contentDetails.duration);
      if (durSec < 60 || durSec > 1800) {
        skippedThisQuery++;
        continue;
      }

      // Check embeddable
      const embeddable = video.status.embeddable ?? false;

      // Extract metadata
      const bpm = extractBpm(fullText);
      const timeSig = extractTimeSignature(fullText);
      const genres = detectGenres(fullText);
      const feels = detectFeels(fullText);
      const views = parseInt(video.statistics.viewCount || '0');
      const likes = parseInt(video.statistics.likeCount || '0');
      const channelId = video.snippet.channelId;
      const channelTitle = video.snippet.channelTitle;
      const tags = (video.snippet.tags || []).slice(0, 10);

      // Determine content type
      let contentType = 'Drum Loop';
      const tl = title.toLowerCase();
      if (tl.includes('backing track') || tl.includes('jam track')) contentType = 'Backing Track';
      if (tl.includes('play along') || tl.includes('play-along')) contentType = 'Play-Along';
      if (tl.includes('drumless') || tl.includes('minus drum')) contentType = 'Backing Track';

      // Get or create creator
      let creatorId: string | null = null;
      if (channelId) {
        const existing = await pool.query('SELECT id FROM creators WHERE youtube_channel_id = $1', [channelId]);
        if (existing.rows.length > 0) {
          creatorId = existing.rows[0].id as string;
        } else {
          // Get channel details
          let subs = 0;
          try {
            const chRes = await ytGet('channels', { part: 'statistics', id: channelId });
            totalApiCalls++;
            quotaUsed += 1;
            if (chRes.items?.[0]) {
              subs = parseInt(chRes.items[0].statistics.subscriberCount || '0');
            }
          } catch {}

          const cRes = await pool.query(
            `INSERT INTO creators (channel_name, youtube_channel_id, subscriber_count, quality_score)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (youtube_channel_id) DO NOTHING
             RETURNING id`,
            [channelTitle, channelId, subs, 0.5]
          );
          if (cRes.rows.length > 0) creatorId = cRes.rows[0].id as string;
          else {
            const re = await pool.query('SELECT id FROM creators WHERE youtube_channel_id = $1', [channelId]);
            if (re.rows.length > 0) creatorId = re.rows[0].id as string;
          }
        }
      }

      // Check if loop already exists
      const existingLoop = await pool.query('SELECT id FROM loops WHERE youtube_video_id = $1', [video.id]);
      if (existingLoop.rows.length > 0) {
        skippedThisQuery++;
        continue;
      }

      // Calculate quality
      const subsRow = creatorId ? (await pool.query('SELECT subscriber_count FROM creators WHERE id = $1', [creatorId])).rows[0] : null;
      const subs: number = subsRow?.subscriber_count ? Number(subsRow.subscriber_count) : 0;
      const qs = qualityScore(views, likes, embeddable, durSec, subs);

      // Insert loop
      const loopRes = await pool.query(
        `INSERT INTO loops (title, source_type, youtube_video_id, youtube_embed_url, creator_id,
         bpm, duration_seconds, view_count, like_count, is_embeddable, is_active, is_featured,
         quality_score, description, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $13, $14)
         RETURNING id`,
        [
          title, 'youtube', video.id, `https://www.youtube.com/embed/${video.id}`,
          creatorId, bpm, durSec, views, likes, embeddable,
          qs > 0.7, // featured if high quality
          qs.toFixed(2),
          (desc || '').substring(0, 500),
          tags,
        ]
      );

      if (loopRes.rows.length > 0) {
        const loopId = loopRes.rows[0].id;

        // Insert taxonomy junctions
        if (timeSig && taxCache.timeSig[timeSig]) {
          await pool.query(
            'INSERT INTO loop_time_signatures (loop_id, time_signature_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [loopId, taxCache.timeSig[timeSig]]
          ).catch(() => {});
        } else if (taxCache.timeSig['4/4']) {
          // Default to 4/4
          await pool.query(
            'INSERT INTO loop_time_signatures (loop_id, time_signature_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [loopId, taxCache.timeSig['4/4']]
          ).catch(() => {});
        }

        for (const genre of genres) {
          if (taxCache.genre[genre]) {
            await pool.query(
              'INSERT INTO loop_genres (loop_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [loopId, taxCache.genre[genre]]
            ).catch(() => {});
          }
        }

        for (const feel of feels) {
          if (taxCache.feel[feel]) {
            await pool.query(
              'INSERT INTO loop_feels (loop_id, feel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [loopId, taxCache.feel[feel]]
            ).catch(() => {});
          }
        }

        if (taxCache.content[contentType]) {
          await pool.query(
            'INSERT INTO loop_content_types (loop_id, content_type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [loopId, taxCache.content[contentType]]
          ).catch(() => {});
        }

        insertedThisQuery++;
      }
    }

    totalInserted += insertedThisQuery;
    totalSkipped += skippedThisQuery;
    console.log(`  Inserted: ${insertedThisQuery}, Skipped: ${skippedThisQuery} (quota: ${quotaUsed})`);
  }

  // Set top loops as featured
  await pool.query(
    'UPDATE loops SET is_featured = true WHERE id IN (SELECT id FROM loops WHERE is_active = true ORDER BY quality_score DESC LIMIT 12)'
  );

  console.log(`\n${'='.repeat(50)}`);
  console.log(`INGEST COMPLETE`);
  console.log(`  Total inserted: ${totalInserted}`);
  console.log(`  Total skipped:  ${totalSkipped}`);
  console.log(`  API calls:      ${totalApiCalls}`);
  console.log(`  Quota used:     ${quotaUsed} / 10,000`);
  console.log(`${'='.repeat(50)}`);

  await pool.end();
}

main().catch(e => { console.error('FATAL:', e); pool.end(); process.exit(1); });
