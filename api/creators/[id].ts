import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db } from "../_lib/db";
import { creators } from "../_lib/db";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const [creator] = await db.select().from(creators).where(eq(creators.id, id));
  if (!creator) return res.status(404).json({ error: "Creator not found" });

  res.json({
    ...creator,
    totalViews: Number(creator.totalViews),
    qualityScore: Number(creator.qualityScore),
  });
}
