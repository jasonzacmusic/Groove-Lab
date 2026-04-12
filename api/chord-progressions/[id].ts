import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, chordProgressions, timeSignatures, genres, eq } from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const [cp] = await db.select().from(chordProgressions).where(eq(chordProgressions.id, id));
  if (!cp) return res.status(404).json({ error: "Chord progression not found" });

  const [ts, genre] = await Promise.all([
    cp.timeSignatureId
      ? db.select().from(timeSignatures).where(eq(timeSignatures.id, cp.timeSignatureId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    cp.genreId
      ? db.select().from(genres).where(eq(genres.id, cp.genreId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  res.json({
    ...cp,
    chords: (cp.chords as Array<any>).map((c: any) => ({
      chord: c.chord || c.symbol || '',
      beats: c.beats || 4,
      measure: c.measure ?? null,
    })),
    timeSignature: ts ?? null,
    genre: genre ? { ...genre, parentGenreId: genre.parentGenreId ?? null } : null,
  });
}
