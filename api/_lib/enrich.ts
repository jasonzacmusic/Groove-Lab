import { db } from "./db";
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
} from "./db";
import { eq } from "drizzle-orm";

export async function enrichLoop(loop: typeof loops.$inferSelect) {
  const [ts, f, g, it, ct, creator] = await Promise.all([
    db
      .select({
        id: timeSignatures.id,
        numerator: timeSignatures.numerator,
        denominator: timeSignatures.denominator,
        displayName: timeSignatures.displayName,
        category: timeSignatures.category,
        sortOrder: timeSignatures.sortOrder,
      })
      .from(loopTimeSignatures)
      .innerJoin(timeSignatures, eq(loopTimeSignatures.timeSignatureId, timeSignatures.id))
      .where(eq(loopTimeSignatures.loopId, loop.id)),
    db
      .select({
        id: feels.id,
        name: feels.name,
        description: feels.description,
        sortOrder: feels.sortOrder,
      })
      .from(loopFeels)
      .innerJoin(feels, eq(loopFeels.feelId, feels.id))
      .where(eq(loopFeels.loopId, loop.id)),
    db
      .select({
        id: genres.id,
        name: genres.name,
        parentGenreId: genres.parentGenreId,
        sortOrder: genres.sortOrder,
      })
      .from(loopGenres)
      .innerJoin(genres, eq(loopGenres.genreId, genres.id))
      .where(eq(loopGenres.loopId, loop.id)),
    db
      .select({
        id: instrumentTypes.id,
        name: instrumentTypes.name,
        category: instrumentTypes.category,
        sortOrder: instrumentTypes.sortOrder,
      })
      .from(loopInstrumentTypes)
      .innerJoin(instrumentTypes, eq(loopInstrumentTypes.instrumentTypeId, instrumentTypes.id))
      .where(eq(loopInstrumentTypes.loopId, loop.id)),
    db
      .select({
        id: contentTypes.id,
        name: contentTypes.name,
        icon: contentTypes.icon,
        sortOrder: contentTypes.sortOrder,
      })
      .from(loopContentTypes)
      .innerJoin(contentTypes, eq(loopContentTypes.contentTypeId, contentTypes.id))
      .where(eq(loopContentTypes.loopId, loop.id)),
    loop.creatorId
      ? db
          .select()
          .from(creators)
          .where(eq(creators.id, loop.creatorId))
          .then((r) => r[0] ?? null)
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
