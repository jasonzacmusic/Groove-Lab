import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { enrichLoop } from "../_lib/enrich";
import { db, loops, contentTypes, loopContentTypes, eq, and, desc } from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    const allContentTypes = await db.select().from(contentTypes).orderBy(contentTypes.sortOrder);

    const categories = await Promise.all(
      allContentTypes.map(async (ct) => {
        const loopIds = await db
          .select({ loopId: loopContentTypes.loopId })
          .from(loopContentTypes)
          .where(eq(loopContentTypes.contentTypeId, ct.id))
          .limit(10);

        if (loopIds.length === 0) return { contentType: ct, loops: [] };

        const loopRows = await db
          .select()
          .from(loops)
          .where(and(eq(loops.isActive, true)))
          .orderBy(desc(loops.qualityScore))
          .limit(8);

        const filtered = loopRows.filter((l) => loopIds.some((lid) => lid.loopId === l.id));
        const enriched = await Promise.all(filtered.slice(0, 6).map(enrichLoop));

        return { contentType: ct, loops: enriched };
      }),
    );

    res.json(categories.filter((c) => c.loops.length > 0));
  } catch (err) {
    console.error("explore/by-category query failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
