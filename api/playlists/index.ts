import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { enrichLoop } from "../_lib/enrich";
import { db, playlists, playlistItems, loops, eq, inArray, asc } from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === "POST") {
    const { userId, title, description, isPublic } = req.body;
    if (!userId || !title) return res.status(400).json({ error: "userId and title required" });

    const [pl] = await db.insert(playlists).values({ userId, title, description, isPublic }).returning();
    return res.status(201).json({ ...pl, loops: [] });
  }

  // GET
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const rows = await db.select().from(playlists).where(eq(playlists.userId, userId));

  const enriched = await Promise.all(
    rows.map(async (pl) => {
      const items = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, pl.id))
        .orderBy(asc(playlistItems.position));

      if (items.length === 0) return { ...pl, loops: [] };

      const loopIds = items.map((i) => i.loopId);
      const loopRows = await db.select().from(loops).where(inArray(loops.id, loopIds));
      const enrichedLoops = await Promise.all(loopRows.map(enrichLoop));

      return { ...pl, loops: enrichedLoops };
    }),
  );

  res.json(enriched);
}
