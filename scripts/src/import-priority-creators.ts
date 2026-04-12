import pg from "pg";
import * as https from "node:https";
import * as fs from "node:fs";
import * as path from "node:path";

const { Pool } = pg;

const DATA_DIR = path.resolve(import.meta.dirname, "../../data");

// ── Types ───────────────────────────────────────────────────────────────────

interface PriorityCreator {
  channelName: string;
  youtubeUrl: string;
  subscriberCount: number | null;
  contentFocus: string[];
  timeSignatures: string[];
  feels: string[];
  estimatedLoopVideos: number | null;
  qualityNotes: string;
  embeddable: boolean;
  priorityVideoIds: string[];
}

interface PriorityCreatorsFile {
  metadata: Record<string, unknown>;
  tier1: PriorityCreator[];
  tier2: PriorityCreator[];
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    tags?: string[];
    publishedAt: string;
  };
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  status: {
    embeddable?: boolean;
  };
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[];
  error?: { message: string; code: number };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractChannelId(youtubeUrl: string): string | null {
  const channelMatch = youtubeUrl.match(/\/channel\/([A-Za-z0-9_-]+)/);
  if (channelMatch) return channelMatch[1];
  // Handle @username URLs — we can't extract a channel ID from these
  const handleMatch = youtubeUrl.match(/\/@([A-Za-z0-9_-]+)/);
  if (handleMatch) return null;
  return null;
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function calculateQualityScore(
  viewCount: number,
  likeCount: number,
  embeddable: boolean,
  durationSeconds: number,
  subscriberCount: number,
): number {
  const viewsComponent = (Math.log10(viewCount + 1) / 6) * 0.3;
  const likesComponent = (Math.log10(likeCount + 1) / 5) * 0.2;
  const embedComponent = embeddable ? 0.2 : 0;
  const durationComponent = (Math.min(durationSeconds, 1800) / 1800) * 0.15;
  const subsComponent = (Math.log10(subscriberCount + 1) / 7) * 0.15;
  return Math.min(1, viewsComponent + likesComponent + embedComponent + durationComponent + subsComponent);
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function fetchVideos(videoIds: string[], apiKey: string): Promise<{ items: YouTubeVideoItem[]; apiCalls: number }> {
  const allItems: YouTubeVideoItem[] = [];
  let apiCalls = 0;

  // Batch up to 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const ids = batch.join(",");
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${ids}&key=${apiKey}`;

    try {
      const raw = await httpsGet(url);
      apiCalls++;
      const response: YouTubeVideosResponse = JSON.parse(raw);

      if (response.error) {
        console.error(`  YouTube API error: ${response.error.message}`);
        continue;
      }

      if (response.items) {
        allItems.push(...response.items);
      }
    } catch (err) {
      console.error(`  Failed to fetch video batch: ${(err as Error).message}`);
    }
  }

  return { items: allItems, apiCalls };
}

// ── Content focus -> content_types mapping ──────────────────────────────────

const CONTENT_FOCUS_MAP: Record<string, string[]> = {
  "drum loops": ["Drum Loop"],
  "drum loop": ["Drum Loop"],
  "backing tracks": ["Backing Track"],
  "backing track": ["Backing Track"],
  "play-along": ["Play-Along"],
  "play along": ["Play-Along"],
  "drum education": ["Tutorial"],
  "lessons": ["Tutorial"],
  "drum lessons": ["Tutorial"],
  "performances": ["Performance"],
  "drum fill": ["Drum Fill"],
  "fills": ["Drum Fill"],
  "rudiments": ["Rudiment"],
  "solo": ["Solo"],
  "drum solos": ["Solo"],
  "tutorial": ["Tutorial"],
  "education": ["Tutorial"],
  "percussion loops": ["Drum Loop"],
  "drum tracks": ["Drum Loop"],
  "drumless backing tracks": ["Backing Track"],
  "drumless tracks": ["Backing Track"],
  "accompaniments": ["Play-Along"],
  "accompaniment": ["Play-Along"],
  "groove breakdown": ["Groove Breakdown"],
  "MIDI": ["MIDI Pattern"],
};

function mapContentFocus(contentFocus: string[]): string[] {
  const contentTypes = new Set<string>();
  for (const focus of contentFocus) {
    const lower = focus.toLowerCase();
    // Check direct mappings
    for (const [key, values] of Object.entries(CONTENT_FOCUS_MAP)) {
      if (lower.includes(key)) {
        for (const v of values) contentTypes.add(v);
      }
    }
  }
  // If nothing matched, default to "Backing Track"
  if (contentTypes.size === 0) contentTypes.add("Backing Track");
  return Array.from(contentTypes);
}

// ── Feels mapping ───────────────────────────────────────────────────────────

const FEELS_MAP: Record<string, string> = {
  "swing": "Swing",
  "shuffle": "Shuffle",
  "straight": "Straight",
  "half-time": "Half-Time",
  "half time": "Half-Time",
  "double-time": "Double-Time",
  "double time": "Double-Time",
  "laid-back": "Laid-Back",
  "laid back": "Laid-Back",
  "driving": "Driving",
  "syncopated": "Syncopated",
  "linear": "Linear",
  "ghost note": "Ghost Note Heavy",
  "train beat": "Train Beat",
  "train": "Train Beat",
};

function mapFeels(feels: string[]): string[] {
  const mapped = new Set<string>();
  for (const feel of feels) {
    const lower = feel.toLowerCase();
    for (const [key, value] of Object.entries(FEELS_MAP)) {
      if (lower.includes(key)) {
        mapped.add(value);
      }
    }
  }
  return Array.from(mapped);
}

// ── Main ────────────────────────────────────────────────────────────────────

(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("YOUTUBE_API_KEY environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  let totalCreatorsInserted = 0;
  let totalLoopsInserted = 0;
  let totalApiCalls = 0;

  try {
    // Load priority creators data
    const dataPath = path.join(DATA_DIR, "priority-creators.json");
    const data: PriorityCreatorsFile = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    // Ensure unique constraints exist for ON CONFLICT to work
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS loops_youtube_video_id_unique
      ON loops (youtube_video_id) WHERE youtube_video_id IS NOT NULL
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS loop_content_types_pkey
      ON loop_content_types (loop_id, content_type_id)
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS loop_time_signatures_pkey
      ON loop_time_signatures (loop_id, time_signature_id)
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS loop_feels_pkey
      ON loop_feels (loop_id, feel_id)
    `);

    // Build taxonomy lookup maps
    const contentTypeLookup = new Map<string, number>();
    const ctRows = await pool.query(`SELECT id, name FROM content_types`);
    for (const row of ctRows.rows) {
      contentTypeLookup.set(row.name as string, row.id as number);
    }

    const timeSigLookup = new Map<string, number>();
    const tsRows = await pool.query(`SELECT id, display_name FROM time_signatures`);
    for (const row of tsRows.rows) {
      timeSigLookup.set(row.display_name as string, row.id as number);
    }

    const feelsLookup = new Map<string, number>();
    const feelsRows = await pool.query(`SELECT id, name FROM feels`);
    for (const row of feelsRows.rows) {
      feelsLookup.set(row.name as string, row.id as number);
    }

    // Process all creators from both tiers
    const tiers: Array<{ tier: string; creators: PriorityCreator[]; qualityScore: number }> = [
      { tier: "tier1", creators: data.tier1, qualityScore: 0.85 },
      { tier: "tier2", creators: data.tier2, qualityScore: 0.70 },
    ];

    for (const { tier, creators, qualityScore } of tiers) {
      console.log(`\n── Processing ${tier} (${creators.length} creators) ──`);

      for (const creator of creators) {
        const channelId = extractChannelId(creator.youtubeUrl);
        if (!channelId) {
          console.log(`  Skipping ${creator.channelName} — could not extract channel ID from ${creator.youtubeUrl}`);
          continue;
        }

        // Insert creator
        const creatorRes = await pool.query(
          `INSERT INTO creators (channel_name, youtube_channel_id, subscriber_count, quality_score, is_verified, is_claimed)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (youtube_channel_id) DO NOTHING`,
          [
            creator.channelName,
            channelId,
            creator.subscriberCount ?? 0,
            qualityScore.toFixed(2),
            false,
            false,
          ],
        );

        if ((creatorRes.rowCount ?? 0) > 0) {
          totalCreatorsInserted++;
        }

        // Retrieve the creator's UUID
        const creatorLookup = await pool.query(
          `SELECT id FROM creators WHERE youtube_channel_id = $1`,
          [channelId],
        );
        const creatorDbId = creatorLookup.rows[0]?.id as string;
        if (!creatorDbId) {
          console.error(`  Could not find creator ID for ${creator.channelName}`);
          continue;
        }

        // Skip if no priority video IDs
        if (!creator.priorityVideoIds || creator.priorityVideoIds.length === 0) {
          console.log(`  ${creator.channelName}: no priority videos to fetch`);
          continue;
        }

        // Fetch videos from YouTube API
        const { items: videos, apiCalls } = await fetchVideos(creator.priorityVideoIds, apiKey);
        totalApiCalls += apiCalls;

        let creatorLoopsInserted = 0;

        for (const video of videos) {
          const durationSeconds = parseISO8601Duration(video.contentDetails.duration);
          const viewCount = parseInt(video.statistics.viewCount ?? "0", 10);
          const likeCount = parseInt(video.statistics.likeCount ?? "0", 10);
          const embeddable = video.status.embeddable ?? false;
          const videoQualityScore = calculateQualityScore(
            viewCount,
            likeCount,
            embeddable,
            durationSeconds,
            creator.subscriberCount ?? 0,
          );

          const description = video.snippet.description
            ? video.snippet.description.substring(0, 1000)
            : null;
          const tags = video.snippet.tags
            ? video.snippet.tags.slice(0, 10)
            : null;

          // Check if loop already exists
          const existingLoop = await pool.query(
            `SELECT id FROM loops WHERE youtube_video_id = $1`,
            [video.id],
          );
          if (existingLoop.rows.length > 0) {
            continue;
          }

          // Insert loop
          const loopRes = await pool.query(
            `INSERT INTO loops (
              title, source_type, youtube_video_id, youtube_embed_url,
              creator_id, duration_seconds, view_count, like_count,
              is_embeddable, is_active, is_featured, quality_score,
              description, tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id`,
            [
              video.snippet.title,
              "youtube",
              video.id,
              `https://www.youtube.com/embed/${video.id}`,
              creatorDbId,
              durationSeconds,
              viewCount,
              likeCount,
              embeddable,
              true,
              false,
              videoQualityScore.toFixed(2),
              description,
              tags,
            ],
          );

          if ((loopRes.rowCount ?? 0) > 0) {
            creatorLoopsInserted++;
            totalLoopsInserted++;

            const loopId = loopRes.rows[0].id as string;

            // Insert content type junctions
            const contentTypeNames = mapContentFocus(creator.contentFocus);
            for (const ctName of contentTypeNames) {
              const ctId = contentTypeLookup.get(ctName);
              if (ctId) {
                await pool.query(
                  `INSERT INTO loop_content_types (loop_id, content_type_id)
                   VALUES ($1, $2)
                   ON CONFLICT DO NOTHING`,
                  [loopId, ctId],
                );
              }
            }

            // Insert time signature junctions
            for (const ts of creator.timeSignatures) {
              // Normalize: try direct match first
              const tsId = timeSigLookup.get(ts);
              if (tsId) {
                await pool.query(
                  `INSERT INTO loop_time_signatures (loop_id, time_signature_id)
                   VALUES ($1, $2)
                   ON CONFLICT DO NOTHING`,
                  [loopId, tsId],
                );
              }
            }

            // Insert feels junctions
            const mappedFeels = mapFeels(creator.feels);
            for (const feelName of mappedFeels) {
              const feelId = feelsLookup.get(feelName);
              if (feelId) {
                await pool.query(
                  `INSERT INTO loop_feels (loop_id, feel_id)
                   VALUES ($1, $2)
                   ON CONFLICT DO NOTHING`,
                  [loopId, feelId],
                );
              }
            }
          }
        }

        console.log(
          `  ${creator.channelName}: fetched ${videos.length}/${creator.priorityVideoIds.length} videos, inserted ${creatorLoopsInserted} loops`,
        );
      }
    }

    console.log("\n══════════════════════════════════════");
    console.log("Import complete!");
    console.log(`  Total creators inserted: ${totalCreatorsInserted}`);
    console.log(`  Total loops inserted:    ${totalLoopsInserted}`);
    console.log(`  Total API calls made:    ${totalApiCalls}`);
    console.log("══════════════════════════════════════");
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
