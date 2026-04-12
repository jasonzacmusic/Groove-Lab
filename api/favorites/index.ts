import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { enrichLoop } from "../_lib/enrich";
import { db } from "@workspace/db";
import { favorites, loops } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === "POST") {
    const { userId, loopId } = req.body;
    if (!userId || !loopId) return res.status(400).json({ error: "userId and loopId required" });

    await db.insert(favorites).values({ userId, loopId }).onConflictDoNothing();
    return res.status(201).json({ success: true });
  }

  if (req.method === "DELETE") {
    const { userId, loopId } = req.body;
    if (!userId || !loopId) return res.status(400).json({ error: "userId and loopId required" });

    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.loopId, loopId)));
    return res.json({ success: true });
  }

  // GET
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const favRows = await db.select().from(favorites).where(eq(favorites.userId, userId));
  if (favRows.length === 0) return res.json([]);

  const loopIds = favRows.map((f) => f.loopId);
  const loopRows = await db.select().from(loops).where(inArray(loops.id, loopIds));
  const enriched = await Promise.all(loopRows.map(enrichLoop));

  res.json(enriched);
}
