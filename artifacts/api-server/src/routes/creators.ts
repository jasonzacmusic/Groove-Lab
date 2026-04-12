import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { creators } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetCreatorsQueryParams,
  GetCreatorParams,
  GetCreatorsResponse,
  GetCreatorResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeCreator(c: typeof creators.$inferSelect) {
  return {
    ...c,
    totalViews: Number(c.totalViews),
    qualityScore: Number(c.qualityScore),
  };
}

router.get("/creators", async (req, res): Promise<void> => {
  const parsed = GetCreatorsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(creators)
    .orderBy(desc(creators.qualityScore))
    .limit(limit)
    .offset(offset);

  res.json(GetCreatorsResponse.parse(rows.map(serializeCreator)));
});

router.get("/creators/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetCreatorParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [creator] = await db.select().from(creators).where(eq(creators.id, params.data.id));
  if (!creator) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }

  res.json(GetCreatorResponse.parse(serializeCreator(creator)));
});

export default router;
