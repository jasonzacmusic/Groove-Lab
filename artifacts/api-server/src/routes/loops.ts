import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  loops,
  creators,
  timeSignatures,
  feels,
  genres,
  instrumentTypes,
  contentTypes,
  loopTimeSignatures,
  loopFeels,
  loopGenres,
  loopInstrumentTypes,
  loopContentTypes,
} from "@workspace/db";
import {
  GetLoopsQueryParams,
  GetLoopParams,
  CreateLoopBody,
  GetLoopsResponse,
  GetLoopResponse,
  GetGrooveMatchResponse,
} from "@workspace/api-zod";
import { eq, and, gte, lte, sql, inArray, desc, asc } from "drizzle-orm";

const router: IRouter = Router();

async function enrichLoop(loop: typeof loops.$inferSelect) {
  const [ts, f, g, it, ct, creator] = await Promise.all([
    db
      .select({ id: timeSignatures.id, numerator: timeSignatures.numerator, denominator: timeSignatures.denominator, displayName: timeSignatures.displayName, category: timeSignatures.category, sortOrder: timeSignatures.sortOrder })
      .from(loopTimeSignatures)
      .innerJoin(timeSignatures, eq(loopTimeSignatures.timeSignatureId, timeSignatures.id))
      .where(eq(loopTimeSignatures.loopId, loop.id)),
    db
      .select({ id: feels.id, name: feels.name, description: feels.description, sortOrder: feels.sortOrder })
      .from(loopFeels)
      .innerJoin(feels, eq(loopFeels.feelId, feels.id))
      .where(eq(loopFeels.loopId, loop.id)),
    db
      .select({ id: genres.id, name: genres.name, parentGenreId: genres.parentGenreId, sortOrder: genres.sortOrder })
      .from(loopGenres)
      .innerJoin(genres, eq(loopGenres.genreId, genres.id))
      .where(eq(loopGenres.loopId, loop.id)),
    db
      .select({ id: instrumentTypes.id, name: instrumentTypes.name, category: instrumentTypes.category, sortOrder: instrumentTypes.sortOrder })
      .from(loopInstrumentTypes)
      .innerJoin(instrumentTypes, eq(loopInstrumentTypes.instrumentTypeId, instrumentTypes.id))
      .where(eq(loopInstrumentTypes.loopId, loop.id)),
    db
      .select({ id: contentTypes.id, name: contentTypes.name, icon: contentTypes.icon, sortOrder: contentTypes.sortOrder })
      .from(loopContentTypes)
      .innerJoin(contentTypes, eq(loopContentTypes.contentTypeId, contentTypes.id))
      .where(eq(loopContentTypes.loopId, loop.id)),
    loop.creatorId
      ? db.select().from(creators).where(eq(creators.id, loop.creatorId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    ...loop,
    viewCount: Number(loop.viewCount),
    likeCount: loop.likeCount,
    qualityScore: Number(loop.qualityScore),
    tags: loop.tags ?? [],
    timeSignatures: ts,
    feels: f,
    genres: g,
    instrumentTypes: it,
    contentTypes: ct,
    creator: creator
      ? {
          ...creator,
          subscriberCount: creator.subscriberCount,
          totalViews: Number(creator.totalViews),
          qualityScore: Number(creator.qualityScore),
        }
      : null,
  };
}

router.get("/loops", async (req, res): Promise<void> => {
  const parsed = GetLoopsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

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

  // Build base query — filtering on taxonomy requires subqueries/joins
  let loopIdFilters: string[] = [];

  if (timeSignatureId !== undefined) {
    const rows = await db
      .select({ loopId: loopTimeSignatures.loopId })
      .from(loopTimeSignatures)
      .where(eq(loopTimeSignatures.timeSignatureId, timeSignatureId));
    loopIdFilters.push(...rows.map((r) => r.loopId));
    if (loopIdFilters.length === 0) {
      res.json(GetLoopsResponse.parse({ loops: [], total: 0, page, limit, totalPages: 0 }));
      return;
    }
  }

  if (feelId !== undefined) {
    const rows = await db
      .select({ loopId: loopFeels.loopId })
      .from(loopFeels)
      .where(eq(loopFeels.feelId, feelId));
    const ids = rows.map((r) => r.loopId);
    loopIdFilters = loopIdFilters.length > 0 ? loopIdFilters.filter((id) => ids.includes(id)) : ids;
    if (loopIdFilters.length === 0) {
      res.json(GetLoopsResponse.parse({ loops: [], total: 0, page, limit, totalPages: 0 }));
      return;
    }
  }

  if (genreId !== undefined) {
    const rows = await db
      .select({ loopId: loopGenres.loopId })
      .from(loopGenres)
      .where(eq(loopGenres.genreId, genreId));
    const ids = rows.map((r) => r.loopId);
    loopIdFilters = loopIdFilters.length > 0 ? loopIdFilters.filter((id) => ids.includes(id)) : ids;
    if (loopIdFilters.length === 0) {
      res.json(GetLoopsResponse.parse({ loops: [], total: 0, page, limit, totalPages: 0 }));
      return;
    }
  }

  if (contentTypeId !== undefined) {
    const rows = await db
      .select({ loopId: loopContentTypes.loopId })
      .from(loopContentTypes)
      .where(eq(loopContentTypes.contentTypeId, contentTypeId));
    const ids = rows.map((r) => r.loopId);
    loopIdFilters = loopIdFilters.length > 0 ? loopIdFilters.filter((id) => ids.includes(id)) : ids;
    if (loopIdFilters.length === 0) {
      res.json(GetLoopsResponse.parse({ loops: [], total: 0, page, limit, totalPages: 0 }));
      return;
    }
  }

  if (loopIdFilters.length > 0) {
    conditions.push(inArray(loops.id, loopIdFilters));
  }

  const orderBy =
    sortBy === "newest"
      ? [desc(loops.createdAt)]
      : sortBy === "most_views"
        ? [desc(loops.viewCount)]
        : sortBy === "bpm_asc"
          ? [asc(loops.bpm)]
          : sortBy === "bpm_desc"
            ? [desc(loops.bpm)]
            : [desc(loops.qualityScore)];

  const [allRows, countRow] = await Promise.all([
    db
      .select()
      .from(loops)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(loops)
      .where(and(...conditions)),
  ]);

  const total = Number(countRow[0]?.count ?? 0);
  const enriched = await Promise.all(allRows.map(enrichLoop));

  res.json(
    GetLoopsResponse.parse({
      loops: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }),
  );
});

router.post("/loops", async (req, res): Promise<void> => {
  const parsed = CreateLoopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { timeSignatureIds, feelIds, genreIds, instrumentTypeIds, contentTypeIds, ...loopData } = parsed.data;

  const [loop] = await db.insert(loops).values(loopData as typeof loops.$inferInsert).returning();

  // Insert junction records
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
  res.status(201).json(GetLoopResponse.parse(enriched));
});

router.get("/loops/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetLoopParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [loop] = await db.select().from(loops).where(eq(loops.id, params.data.id));
  if (!loop) {
    res.status(404).json({ error: "Loop not found" });
    return;
  }

  const enriched = await enrichLoop(loop);
  res.json(GetLoopResponse.parse(enriched));
});

router.get("/loops/:id/groove-match", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetGrooveMatchResponse;
  if (!raw) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [loop] = await db.select().from(loops).where(eq(loops.id, raw));
  if (!loop) {
    res.status(404).json({ error: "Loop not found" });
    return;
  }

  // Find loops with same time signature and similar BPM
  const tsRows = await db
    .select({ timeSignatureId: loopTimeSignatures.timeSignatureId })
    .from(loopTimeSignatures)
    .where(eq(loopTimeSignatures.loopId, raw));

  const tsIds = tsRows.map((r) => r.timeSignatureId);

  let candidates: (typeof loops.$inferSelect)[] = [];

  if (tsIds.length > 0) {
    const candidateIds = await db
      .select({ loopId: loopTimeSignatures.loopId })
      .from(loopTimeSignatures)
      .where(inArray(loopTimeSignatures.timeSignatureId, tsIds));

    const uniqueIds = [...new Set(candidateIds.map((r) => r.loopId))].filter((id) => id !== raw);

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
      .where(and(eq(loops.isActive, true), sql`${loops.id} != ${raw}`))
      .orderBy(desc(loops.qualityScore))
      .limit(6);
  }

  const enriched = await Promise.all(candidates.map(enrichLoop));
  res.json(GetGrooveMatchResponse.parse(enriched));
});

export default router;
