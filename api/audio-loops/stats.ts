import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, desc, sql } from "../_lib/db";
import { audioLoops } from "../../lib/db/src/schema/groovelab";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;

  const [stats] = await db
    .select({
      totalLoops: sql<number>`count(*)::int`,
      uniqueArtists: sql<number>`count(distinct ${audioLoops.artist})::int`,
      uniqueGenres: sql<number>`count(distinct ${audioLoops.genre})::int`,
    })
    .from(audioLoops);

  const [mostPlayed] = await db
    .select()
    .from(audioLoops)
    .orderBy(desc(audioLoops.playCount))
    .limit(1);

  res.json({
    totalLoops: stats?.totalLoops ?? 0,
    uniqueArtists: stats?.uniqueArtists ?? 0,
    uniqueGenres: stats?.uniqueGenres ?? 0,
    mostPlayed: mostPlayed ?? null,
  });
}
