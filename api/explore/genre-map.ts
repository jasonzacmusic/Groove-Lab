import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, genres, feels, loopGenres, loopFeels, eq, sql } from "../_lib/db";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const allGenres = await db.select().from(genres).orderBy(genres.sortOrder);

  const mapData = await Promise.all(
    allGenres.map(async (genre) => {
      const loopIdRows = await db
        .select({ loopId: loopGenres.loopId })
        .from(loopGenres)
        .where(eq(loopGenres.genreId, genre.id));

      const pos = GENRE_MAP_POSITIONS[genre.name] ?? { x: 0.5, y: 0.5 };

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

  res.json(mapData);
}
