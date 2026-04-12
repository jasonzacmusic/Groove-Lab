import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { enrichLoop } from "../_lib/enrich";
import { db } from "../_lib/db";
import {
  loops,
  loopTimeSignatures,
  loopFeels,
  loopGenres,
  loopInstrumentTypes,
  loopContentTypes,
} from "../_lib/db";
import {
  GetLoopsQueryParams,
  CreateLoopBody,
} from "../_lib/api-zod";
import { eq, and, gte, lte, sql, inArray, desc, asc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method === "POST") {
    const parsed = CreateLoopBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const { timeSignatureIds, feelIds, genreIds, instrumentTypeIds, contentTypeIds, ...loopData } = parsed.data;
    const [loop] = await db.insert(loops).values(loopData as typeof loops.$inferInsert).returning();

    await Promise.all([
      timeSignatureIds?.length
        ? db.insert(loopTimeSignatures).values(timeSignatureIds.map((id) => ({ loopId: loop.id, timeSignatureId: id })))
        : Promise.resolve(),
      feelIds?.length
        ? db.insert(loopFeels).values(feelIds.map((id) => ({ loopId: loop.id, feelId: id })))
        : Promise.resolve(),
      genreIds?.length
        ? db.insert(loopGenres).values(genreIds.map((id) => ({ loopId: loop.id, genreId: id })))
        : Promise.resolve(),
      instrumentTypeIds?.length
        ? db.insert(loopInstrumentTypes).values(instrumentTypeIds.map((id) => ({ loopId: loop.id, instrumentTypeId: id })))
        : Promise.resolve(),
      contentTypeIds?.length
        ? db.insert(loopContentTypes).values(contentTypeIds.map((id) => ({ loopId: loop.id, contentTypeId: id })))
        : Promise.resolve(),
    ]);

    const enriched = await enrichLoop(loop);
    return res.status(201).json(enriched);
  }

  // GET /api/loops
  const parsed = GetLoopsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const {
    page = 1,
    limit = 20,
    timeSignatureId,
    feelId,
    genreId,
    instrumentTypeId,
    contentTypeId,
    bpmMin,
    bpmMax,
    sortBy = "quality_score",
    search,
    featured,
  } = parsed.data;

  const offset = (page - 1) * limit;
  const conditions = [eq(loops.isActive, true)];

  if (bpmMin !== undefined) conditions.push(gte(loops.bpm, bpmMin));
  if (bpmMax !== undefined) conditions.push(lte(loops.bpm, bpmMax));
  if (featured !== undefined) conditions.push(eq(loops.isFeatured, featured));

  let loopIdFilters: string[] = [];

  if (timeSignatureId !== undefined) {
    const rows = await db.select({ loopId: loopTimeSignatures.loopId }).from(loopTimeSignatures).where(eq(loopTimeSignatures.timeSignatureId, timeSignatureId));
    loopIdFilters.push(...rows.map((r) => r.loopId));
    if (loopIdFilters.length === 0) return res.json({ loops: [], total: 0, page, limit, totalPages: 0 });
  }

  if (feelId !== undefined) {
    const rows = await db.select({ loopId: loopFeels.loopId }).from(loopFeels).where(eq(loopFeels.feelId, feelId));
    const ids = rows.map((r) => r.loopId);
    loopIdFilters = loopIdFilters.length > 0 ? loopIdFilters.filter((id) => ids.includes(id)) : ids;
    if (loopIdFilters.length === 0) return res.json({ loops: [], total: 0, page, limit, totalPages: 0 });
  }

  if (genreId !== undefined) {
    const rows = await db.select({ loopId: loopGenres.loopId }).from(loopGenres).where(eq(loopGenres.genreId, genreId));
    const ids = rows.map((r) => r.loopId);
    loopIdFilters = loopIdFilters.length > 0 ? loopIdFilters.filter((id) => ids.includes(id)) : ids;
    if (loopIdFilters.length === 0) return res.json({ loops: [], total: 0, page, limit, totalPages: 0 });
  }

  if (contentTypeId !== undefined) {
    const rows = await db.select({ loopId: loopContentTypes.loopId }).from(loopContentTypes).where(eq(loopContentTypes.contentTypeId, contentTypeId));
    const ids = rows.map((r) => r.loopId);
    loopIdFilters = loopIdFilters.length > 0 ? loopIdFilters.filter((id) => ids.includes(id)) : ids;
    if (loopIdFilters.length === 0) return res.json({ loops: [], total: 0, page, limit, totalPages: 0 });
  }

  if (loopIdFilters.length > 0) conditions.push(inArray(loops.id, loopIdFilters));

  const orderBy =
    sortBy === "newest" ? [desc(loops.createdAt)]
    : sortBy === "most_views" ? [desc(loops.viewCount)]
    : sortBy === "bpm_asc" ? [asc(loops.bpm)]
    : sortBy === "bpm_desc" ? [desc(loops.bpm)]
    : [desc(loops.qualityScore)];

  const [allRows, countRow] = await Promise.all([
    db.select().from(loops).where(and(...conditions)).orderBy(...orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(loops).where(and(...conditions)),
  ]);

  const total = Number(countRow[0]?.count ?? 0);
  const enriched = await Promise.all(allRows.map(enrichLoop));

  res.json({ loops: enriched, total, page, limit, totalPages: Math.ceil(total / limit) });
}
