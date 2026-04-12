import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../../_lib/cors";
import { enrichLoop } from "../../_lib/enrich";
import { db } from "@workspace/db";
import { loops, loopTimeSignatures } from "@workspace/db";
import { eq, and, sql, inArray, desc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const [loop] = await db.select().from(loops).where(eq(loops.id, id));
  if (!loop) return res.status(404).json({ error: "Loop not found" });

  const tsRows = await db
    .select({ timeSignatureId: loopTimeSignatures.timeSignatureId })
    .from(loopTimeSignatures)
    .where(eq(loopTimeSignatures.loopId, id));

  const tsIds = tsRows.map((r) => r.timeSignatureId);
  let candidates: (typeof loops.$inferSelect)[] = [];

  if (tsIds.length > 0) {
    const candidateIds = await db
      .select({ loopId: loopTimeSignatures.loopId })
      .from(loopTimeSignatures)
      .where(inArray(loopTimeSignatures.timeSignatureId, tsIds));

    const uniqueIds = [...new Set(candidateIds.map((r) => r.loopId))].filter((lid) => lid !== id);

    if (uniqueIds.length > 0) {
      candidates = await db
        .select()
        .from(loops)
        .where(and(eq(loops.isActive, true), inArray(loops.id, uniqueIds)))
        .orderBy(desc(loops.qualityScore))
        .limit(6);
    }
  }

  if (candidates.length === 0) {
    candidates = await db
      .select()
      .from(loops)
      .where(and(eq(loops.isActive, true), sql`${loops.id} != ${id}`))
      .orderBy(desc(loops.qualityScore))
      .limit(6);
  }

  const enriched = await Promise.all(candidates.map(enrichLoop));
  res.json(enriched);
}
