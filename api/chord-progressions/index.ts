import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, chordProgressions, timeSignatures, genres, eq, and } from "../_lib/db";

async function enrichChordProgression(cp: typeof chordProgressions.$inferSelect) {
  const [ts, genre] = await Promise.all([
    cp.timeSignatureId
      ? db.select().from(timeSignatures).where(eq(timeSignatures.id, cp.timeSignatureId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    cp.genreId
      ? db.select().from(genres).where(eq(genres.id, cp.genreId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    ...cp,
    chords: (cp.chords as Array<any>).map((c: any) => ({
      chord: c.chord || c.symbol || '',
      beats: c.beats || 4,
      measure: c.measure ?? null,
    })),
    timeSignature: ts ?? null,
    genre: genre ? { ...genre, parentGenreId: genre.parentGenreId ?? null } : null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const { type, key, genreId, difficulty, isJazzStandard } = req.query;

  const conditions = [];
  if (type) conditions.push(eq(chordProgressions.progressionType, type as string));
  if (key) conditions.push(eq(chordProgressions.keySignature, key as string));
  if (genreId) conditions.push(eq(chordProgressions.genreId, Number(genreId)));
  if (difficulty) conditions.push(eq(chordProgressions.difficultyLevel, Number(difficulty)));
  if (isJazzStandard !== undefined) conditions.push(eq(chordProgressions.isJazzStandard, isJazzStandard === "true"));

  const rows =
    conditions.length > 0
      ? await db.select().from(chordProgressions).where(and(...conditions))
      : await db.select().from(chordProgressions);

  const enriched = await Promise.all(rows.map(enrichChordProgression));
  res.json(enriched);
}
