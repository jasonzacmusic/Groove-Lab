import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  playlists,
  playlistItems,
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
import { eq, inArray, asc } from "drizzle-orm";
import {
  GetPlaylistsQueryParams,
  CreatePlaylistBody,
  GetPlaylistsResponse,
  CreatePlaylistBody as CreatePlaylistResponse,
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
    qualityScore: Number(loop.qualityScore),
    tags: loop.tags ?? [],
    timeSignatures: ts,
    feels: f,
    genres: g,
    instrumentTypes: it,
    contentTypes: ct,
    creator: creator
      ? { ...creator, totalViews: Number(creator.totalViews), qualityScore: Number(creator.qualityScore) }
      : null,
  };
}

router.get("/playlists", async (req, res): Promise<void> => {
  const parsed = GetPlaylistsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = parsed.data;
  const rows = await db.select().from(playlists).where(eq(playlists.userId, userId));

  const enriched = await Promise.all(
    rows.map(async (pl) => {
      const items = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, pl.id))
        .orderBy(asc(playlistItems.position));

      if (items.length === 0) return { ...pl, loops: [] };

      const loopIds = items.map((i) => i.loopId);
      const loopRows = await db.select().from(loops).where(inArray(loops.id, loopIds));
      const enrichedLoops = await Promise.all(loopRows.map(enrichLoop));

      return { ...pl, loops: enrichedLoops };
    }),
  );

  res.json(GetPlaylistsResponse.parse(enriched));
});

router.post("/playlists", async (req, res): Promise<void> => {
  const parsed = CreatePlaylistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pl] = await db.insert(playlists).values(parsed.data).returning();

  res.status(201).json({ ...pl, loops: [] });
});

export default router;
