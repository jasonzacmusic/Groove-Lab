import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  loops,
  creators,
  contentTypes,
  genres,
  loopTimeSignatures,
  loopFeels,
  loopGenres,
  loopInstrumentTypes,
  loopContentTypes,
  timeSignatures,
  feels,
  instrumentTypes,
} from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  GetFeaturedLoopsResponse,
  GetLoopsByCategoryResponse,
  GetGenreMapResponse,
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

router.get("/explore/featured", async (_req, res): Promise<void> => {
  const featured = await db
    .select()
    .from(loops)
    .where(and(eq(loops.isActive, true), eq(loops.isFeatured, true)))
    .orderBy(desc(loops.qualityScore))
    .limit(8);

  const enriched = await Promise.all(featured.map(enrichLoop));
  res.json(GetFeaturedLoopsResponse.parse(enriched));
});

router.get("/explore/by-category", async (_req, res): Promise<void> => {
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

  const nonEmpty = categories.filter((c) => c.loops.length > 0);
  res.json(GetLoopsByCategoryResponse.parse(nonEmpty));
});

// Genre/feel map: positions genres on a 2D plane
// X = straight (0) to swung (1) based on feel distribution
// Y = simple (0) to complex (1) based on genre complexity
const GENRE_MAP_POSITIONS: Record<string, { x: number; y: number }> = {
  Jazz: { x: 0.75, y: 0.8 },
  Blues: { x: 0.6, y: 0.45 },
  Funk: { x: 0.3, y: 0.6 },
  "Neo-Soul": { x: 0.45, y: 0.65 },
  "R&B": { x: 0.4, y: 0.55 },
  Gospel: { x: 0.55, y: 0.5 },
  Rock: { x: 0.2, y: 0.4 },
  Pop: { x: 0.15, y: 0.3 },
  Latin: { x: 0.5, y: 0.7 },
  "Bossa Nova": { x: 0.65, y: 0.65 },
  Samba: { x: 0.55, y: 0.7 },
  Salsa: { x: 0.45, y: 0.8 },
  "Afro-Cuban": { x: 0.5, y: 0.85 },
  Afrobeat: { x: 0.35, y: 0.75 },
  Reggae: { x: 0.7, y: 0.35 },
  "Hip-Hop": { x: 0.25, y: 0.5 },
  "Drum & Bass": { x: 0.1, y: 0.6 },
  Electronic: { x: 0.05, y: 0.5 },
  Classical: { x: 0.1, y: 0.9 },
  World: { x: 0.6, y: 0.7 },
  Country: { x: 0.3, y: 0.25 },
  Fusion: { x: 0.5, y: 0.95 },
  Progressive: { x: 0.2, y: 0.9 },
  Metal: { x: 0.1, y: 0.7 },
  Ska: { x: 0.7, y: 0.45 },
};

router.get("/explore/genre-map", async (_req, res): Promise<void> => {
  const allGenres = await db.select().from(genres).orderBy(genres.sortOrder);

  const mapData = await Promise.all(
    allGenres.map(async (genre) => {
      const loopIdRows = await db
        .select({ loopId: loopGenres.loopId })
        .from(loopGenres)
        .where(eq(loopGenres.genreId, genre.id));

      const pos = GENRE_MAP_POSITIONS[genre.name] ?? { x: 0.5, y: 0.5 };

      // Get the dominant feel for this genre
      let feelName: string | null = null;
      let feelId: number | null = null;

      if (loopIdRows.length > 0) {
        const feelRows = await db
          .select({ feelId: loopFeels.feelId })
          .from(loopFeels)
          .where(
            sql`${loopFeels.loopId} IN (${sql.join(loopIdRows.map((r) => sql`${r.loopId}`), sql`, `)})`,
          )
          .limit(10);

        if (feelRows.length > 0) {
          feelId = feelRows[0].feelId;
          const [feel] = await db.select().from(feels).where(eq(feels.id, feelId));
          feelName = feel?.name ?? null;
        }
      }

      return {
        genreId: genre.id,
        genreName: genre.name,
        feelId,
        feelName,
        x: pos.x,
        y: pos.y,
        loopCount: loopIdRows.length,
      };
    }),
  );

  res.json(GetGenreMapResponse.parse(mapData));
});

export default router;
