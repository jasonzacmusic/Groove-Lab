import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { enrichLoop } from "../_lib/enrich";
import { db } from "@workspace/db";
import { loops } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const featured = await db
    .select()
    .from(loops)
    .where(and(eq(loops.isActive, true), eq(loops.isFeatured, true)))
    .orderBy(desc(loops.qualityScore))
    .limit(8);

  const enriched = await Promise.all(featured.map(enrichLoop));
  res.json(enriched);
}
