import pg from "pg";
import * as https from "node:https";
import * as fs from "node:fs";
import * as path from "node:path";

const { Pool } = pg;

const DATA_DIR = path.resolve(import.meta.dirname, "../../data");
const PROGRESS_FILE = path.join(DATA_DIR, "youtube-ingest-progress.json");
const QUERIES_FILE = path.join(DATA_DIR, "youtube-search-queries.json");
const DEEP_QUERIES_FILE = path.join(DATA_DIR, "youtube-deep-queries.json");

const DAILY_QUOTA_LIMIT = 10_000;
const SEARCH_COST = 100;
const VIDEO_COST = 1;
const CHANNEL_COST = 1;

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: { channelId: string; title: string; description: string; channelTitle: string };
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
    thumbnails: Record<string, { url: string }>;
  };
  contentDetails: { duration: string };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  status: { embeddable?: boolean };
}

interface YouTubeChannelItem {
  id: string;
  snippet: { title: string; description: string; thumbnails: Record<string, { url: string }> };
  statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
}

interface Progress {
  completedQueries: string[];
  quotaUsed: number;
  totalVideosIngested: number;
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {
    // ignore corrupt progress file
  }
  return { completedQueries: [], quotaUsed: 0, totalVideosIngested: 0 };
}

function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
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
  views: number,
  likes: number,
  embeddable: boolean,
  durationSeconds: number,
  subscriberCount: number,
): number {
  const durationMinutes = durationSeconds / 60;
  const score =
    (Math.log10(views + 1) / 6) * 0.3 +
    (Math.log10(likes + 1) / 5) * 0.2 +
    (embeddable ? 0.2 : 0) +
    (Math.min(durationMinutes, 30) / 30) * 0.15 +
    (Math.log10(subscriberCount + 1) / 7) * 0.15;
  return Math.min(1, score);
}

(async () => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!apiKey) {
    console.error("YOUTUBE_API_KEY environment variable is required");
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const progress = loadProgress();

  // Load queries from the primary search-queries file
  const queriesData = JSON.parse(fs.readFileSync(QUERIES_FILE, "utf-8"));
  const baseQueries: string[] = [
    ...(queriesData.loopQueries || []),
    ...(queriesData.examQueries || []),
    ...(queriesData.standardsQueries || []),
  ];

  // Load queries from the deep-queries file (categories object with arrays)
  let deepQueries: string[] = [];
  try {
    if (fs.existsSync(DEEP_QUERIES_FILE)) {
      const deepData = JSON.parse(fs.readFileSync(DEEP_QUERIES_FILE, "utf-8"));
      const categories: Record<string, string[]> = deepData.categories || {};
      for (const categoryQueries of Object.values(categories)) {
        deepQueries.push(...categoryQueries);
      }
    }
  } catch {
    console.warn("Warning: could not load deep queries file, continuing with base queries only.");
  }

  // Merge and deduplicate
  const allQueries: string[] = [...new Set([...baseQueries, ...deepQueries])];

  const pendingQueries = allQueries.filter((q) => !progress.completedQueries.includes(q));

  console.log(`Total queries: ${allQueries.length}, Pending: ${pendingQueries.length}, Quota used: ${progress.quotaUsed}/${DAILY_QUOTA_LIMIT}`);

  let queriesProcessed = 0;

  try {
    for (const query of pendingQueries) {
      // Check if we have enough quota for at least a search
      if (progress.quotaUsed + SEARCH_COST > DAILY_QUOTA_LIMIT) {
        console.log(`Quota limit reached (${progress.quotaUsed}/${DAILY_QUOTA_LIMIT}). Stopping.`);
        break;
      }

      // 1. Search for videos
      const searchUrl =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`;

      let searchData: { items?: YouTubeSearchItem[] };
      try {
        const raw = await httpsGet(searchUrl);
        searchData = JSON.parse(raw);
      } catch (err) {
        console.error(`Search failed for query "${query}":`, err);
        continue;
      }
      progress.quotaUsed += SEARCH_COST;

      const items = searchData.items || [];
      if (items.length === 0) {
        progress.completedQueries.push(query);
        saveProgress(progress);
        queriesProcessed++;
        continue;
      }

      const videoIds = items.map((i) => i.id.videoId).filter(Boolean);
      const channelIds = [...new Set(items.map((i) => i.snippet.channelId))];

      // 2. Get video details
      const videosUrl =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=snippet,contentDetails,statistics,status&id=${videoIds.join(",")}&key=${apiKey}`;

      let videoData: { items?: YouTubeVideoItem[] };
      try {
        const raw = await httpsGet(videosUrl);
        videoData = JSON.parse(raw);
      } catch (err) {
        console.error(`Videos.list failed for query "${query}":`, err);
        progress.completedQueries.push(query);
        saveProgress(progress);
        queriesProcessed++;
        continue;
      }
      progress.quotaUsed += VIDEO_COST;

      // 3. Get channel details (batch unique channels)
      const channelMap = new Map<string, YouTubeChannelItem>();
      if (channelIds.length > 0) {
        const channelsUrl =
          `https://www.googleapis.com/youtube/v3/channels` +
          `?part=snippet,statistics&id=${channelIds.join(",")}&key=${apiKey}`;

        try {
          const raw = await httpsGet(channelsUrl);
          const channelData: { items?: YouTubeChannelItem[] } = JSON.parse(raw);
          for (const ch of channelData.items || []) {
            channelMap.set(ch.id, ch);
          }
        } catch (err) {
          console.error(`Channels.list failed for query "${query}":`, err);
        }
        progress.quotaUsed += CHANNEL_COST;
      }

      // 4. Insert creators and videos
      const videos = videoData.items || [];
      for (const video of videos) {
        const channel = channelMap.get(video.snippet.channelId);
        const subscriberCount = parseInt(channel?.statistics?.subscriberCount || "0", 10);
        const channelTotalViews = parseInt(channel?.statistics?.viewCount || "0", 10);
        const channelVideoCount = parseInt(channel?.statistics?.videoCount || "0", 10);

        // Upsert creator
        let creatorId: string | null = null;
        try {
          const creatorRes = await pool.query(
            `INSERT INTO creators (youtube_channel_id, channel_name, channel_url, subscriber_count, total_views, video_count, description, avatar_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (youtube_channel_id) DO UPDATE SET
               subscriber_count = EXCLUDED.subscriber_count,
               total_views = EXCLUDED.total_views,
               video_count = EXCLUDED.video_count,
               updated_at = NOW()
             RETURNING id`,
            [
              video.snippet.channelId,
              video.snippet.channelTitle,
              `https://www.youtube.com/channel/${video.snippet.channelId}`,
              subscriberCount,
              channelTotalViews,
              channelVideoCount,
              channel?.snippet?.description || null,
              channel?.snippet?.thumbnails?.default?.url || null,
            ],
          );
          creatorId = (creatorRes.rows[0]?.id as string) || null;
        } catch (err) {
          console.error(`Creator insert failed for ${video.snippet.channelId}:`, err);
        }

        // Calculate quality score
        const views = parseInt(video.statistics.viewCount || "0", 10);
        const likes = parseInt(video.statistics.likeCount || "0", 10);
        const commentCount = parseInt(video.statistics.commentCount || "0", 10);
        const embeddable = video.status.embeddable !== false;
        const durationSeconds = parseISO8601Duration(video.contentDetails.duration);
        const qualityScore = calculateQualityScore(views, likes, embeddable, durationSeconds, subscriberCount);

        // Insert loop
        try {
          const loopRes = await pool.query(
            `INSERT INTO loops
              (title, source_type, youtube_video_id, youtube_embed_url, creator_id,
               duration_seconds, view_count, like_count, comment_count, quality_score,
               is_embeddable, description, tags, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT DO NOTHING`,
            [
              video.snippet.title,
              "youtube",
              video.id,
              `https://www.youtube.com/embed/${video.id}`,
              creatorId,
              durationSeconds,
              views,
              likes,
              commentCount,
              qualityScore.toFixed(2),
              embeddable,
              video.snippet.description?.substring(0, 2000) || null,
              video.snippet.tags || null,
              true,
            ],
          );
          if ((loopRes.rowCount ?? 0) > 0) {
            progress.totalVideosIngested++;
          }
        } catch (err) {
          console.error(`Loop insert failed for video ${video.id}:`, err);
        }
      }

      progress.completedQueries.push(query);
      saveProgress(progress);
      queriesProcessed++;

      console.log(
        `Processed ${progress.completedQueries.length}/${allQueries.length} queries, ` +
        `${progress.totalVideosIngested} videos ingested, ` +
        `${progress.quotaUsed} quota units used`,
      );
    }

    console.log("\nIngestion complete!");
    console.log(`  Queries processed this run: ${queriesProcessed}`);
    console.log(`  Total queries completed: ${progress.completedQueries.length}/${allQueries.length}`);
    console.log(`  Total videos ingested: ${progress.totalVideosIngested}`);
    console.log(`  Quota used: ${progress.quotaUsed}/${DAILY_QUOTA_LIMIT}`);
  } catch (err) {
    console.error("Ingestion failed:", err);
    saveProgress(progress);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
