import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, desc, sql } from "../_lib/db";
import { audioLoops } from "../../lib/db/src/schema/groovelab";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;

  const rows = await db
    .select({
      artist: audioLoops.artist,
      loopCount: sql<number>`count(*)::int`,
    })
    .from(audioLoops)
    .groupBy(audioLoops.artist)
    .orderBy(desc(sql`count(*)`));

  res.json({ artists: rows });
}
