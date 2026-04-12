import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  favorites,
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
import { eq, and, inArray } from "drizzle-orm";
import {
  GetFavoritesQueryParams,
  AddFavoriteBody,
  RemoveFavoriteBody,
  GetFavoritesResponse,
} from "@workspace/api-zod";

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

router.get("/favorites", async (req, res): Promise<void> => {
  const parsed = GetFavoritesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = parsed.data;
  const favRows = await db.select().from(favorites).where(eq(favorites.userId, userId));

  if (favRows.length === 0) {
    res.json(GetFavoritesResponse.parse([]));
    return;
  }

  const loopIds = favRows.map((f) => f.loopId);
  const loopRows = await db.select().from(loops).where(inArray(loops.id, loopIds));
  const enriched = await Promise.all(loopRows.map(enrichLoop));

  res.json(GetFavoritesResponse.parse(enriched));
});

router.post("/favorites", async (req, res): Promise<void> => {
  const parsed = AddFavoriteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .insert(favorites)
    .values({ userId: parsed.data.userId, loopId: parsed.data.loopId })
    .onConflictDoNothing();

  res.status(201).json({ success: true });
});

router.delete("/favorites", async (req, res): Promise<void> => {
  const parsed = RemoveFavoriteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, parsed.data.userId), eq(favorites.loopId, parsed.data.loopId)));

  res.json({ success: true });
});

export default router;
