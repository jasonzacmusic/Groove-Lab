import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../../_lib/cors";
import { enrichLoop } from "../../_lib/enrich";
import { db } from "@workspace/db";
import { loops } from "@workspace/db";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const [loop] = await db.select().from(loops).where(eq(loops.id, id));
  if (!loop) return res.status(404).json({ error: "Loop not found" });

  const enriched = await enrichLoop(loop);
  res.json(enriched);
}
