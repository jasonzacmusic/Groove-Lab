import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { chordProgressions, timeSignatures, genres } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetChordProgressionsQueryParams,
  GetChordProgressionParams,
  GetChordProgressionsResponse,
  GetChordProgressionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
    chords: (cp.chords as Array<{ chord: string; beats: number; measure?: number }>),
    timeSignature: ts ?? null,
    genre: genre ? { ...genre, parentGenreId: genre.parentGenreId ?? null } : null,
  };
}

router.get("/chord-progressions", async (req, res): Promise<void> => {
  const parsed = GetChordProgressionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, key, genreId, difficulty, isJazzStandard } = parsed.data;

  const conditions = [];
  if (type !== undefined) conditions.push(eq(chordProgressions.progressionType, type));
  if (key !== undefined) conditions.push(eq(chordProgressions.keySignature, key));
  if (genreId !== undefined) conditions.push(eq(chordProgressions.genreId, genreId));
  if (difficulty !== undefined) conditions.push(eq(chordProgressions.difficultyLevel, difficulty));
  if (isJazzStandard !== undefined) conditions.push(eq(chordProgressions.isJazzStandard, isJazzStandard));

  const rows =
    conditions.length > 0
      ? await db.select().from(chordProgressions).where(and(...conditions))
      : await db.select().from(chordProgressions);

  const enriched = await Promise.all(rows.map(enrichChordProgression));
  res.json(GetChordProgressionsResponse.parse(enriched));
});

router.get("/chord-progressions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetChordProgressionParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cp] = await db.select().from(chordProgressions).where(eq(chordProgressions.id, params.data.id));
  if (!cp) {
    res.status(404).json({ error: "Chord progression not found" });
    return;
  }

  const enriched = await enrichChordProgression(cp);
  res.json(GetChordProgressionResponse.parse(enriched));
});

export default router;
