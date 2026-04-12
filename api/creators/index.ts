import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, creators, desc } from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(creators)
    .orderBy(desc(creators.qualityScore))
    .limit(limit)
    .offset(offset);

  res.json(
    rows.map((c) => ({
      ...c,
      totalViews: Number(c.totalViews),
      qualityScore: Number(c.qualityScore),
    })),
  );
}
