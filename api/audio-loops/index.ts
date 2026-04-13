import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, eq, and, gte, lte, desc, asc, sql } from "../_lib/db";
import { audioLoops } from "../../lib/db/src/schema/groovelab";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;

  const { artist, genre, bpm_min, bpm_max, key, feel, instrument_category,
          time_signature, section_type, search, sort, page: pageStr, limit: limitStr } = req.query;

  const page = Number(pageStr) || 1;
  const limit = Math.min(Number(limitStr) || 20, 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (artist) conditions.push(sql`${audioLoops.artist} ILIKE ${artist as string}`);
  if (genre) conditions.push(sql`${audioLoops.genre} ILIKE ${genre as string}`);
  if (feel) conditions.push(sql`${audioLoops.feel} ILIKE ${feel as string}`);
  if (instrument_category) conditions.push(sql`${audioLoops.instrumentCategory} ILIKE ${instrument_category as string}`);
  if (time_signature) conditions.push(eq(audioLoops.timeSignature, time_signature as string));
  if (section_type) conditions.push(sql`${audioLoops.sectionType} ILIKE ${section_type as string}`);
  if (key) conditions.push(sql`${audioLoops.keySignature} ILIKE ${key as string}`);
  if (bpm_min) conditions.push(gte(audioLoops.bpm, Number(bpm_min)));
  if (bpm_max) conditions.push(lte(audioLoops.bpm, Number(bpm_max)));
  if (search) conditions.push(sql`(${audioLoops.title} ILIKE ${'%' + search + '%'} OR ${audioLoops.grooveName} ILIKE ${'%' + search + '%'} OR ${audioLoops.artist} ILIKE ${'%' + search + '%'})`);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy = sort === 'bpm_asc' ? [asc(audioLoops.bpm)]
    : sort === 'bpm_desc' ? [desc(audioLoops.bpm)]
    : sort === 'artist' ? [asc(audioLoops.artist)]
    : sort === 'most_played' ? [desc(audioLoops.playCount)]
    : [desc(audioLoops.createdAt)];

  const [rows, countRow] = await Promise.all([
    db.select().from(audioLoops).where(where).orderBy(...orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(audioLoops).where(where),
  ]);

  res.json({ loops: rows, total: Number(countRow[0]?.count ?? 0), page, limit });
}
