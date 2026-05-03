import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, eq, and, gte, lte, desc, asc, sql } from "../_lib/db";
import { audioLoops } from "../../lib/db/src/schema/groovelab";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;

  const { artist, genre, bpm_min, bpm_max, key, feel, instrument_category,
          time_signature, section_type, collection, search, sort, page: pageStr, limit: limitStr } = req.query;

  const page = Number(pageStr) || 1;
  const limit = Math.min(Number(limitStr) || 20, 200);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (artist) conditions.push(sql`${audioLoops.artist} ILIKE ${artist as string}`);
  if (genre) conditions.push(sql`${audioLoops.genre} ILIKE ${genre as string}`);
  if (feel) conditions.push(sql`${audioLoops.feel} ILIKE ${feel as string}`);
  if (instrument_category) {
    const cats = (instrument_category as string).split(",").map(s => s.trim());
    if (cats.length === 1) {
      conditions.push(sql`${audioLoops.instrumentCategory} ILIKE ${cats[0]}`);
    } else {
      conditions.push(sql`${audioLoops.instrumentCategory} ILIKE ANY(${cats})`);
    }
  }
  if (time_signature) conditions.push(eq(audioLoops.timeSignature, time_signature as string));
  if (section_type) conditions.push(sql`${audioLoops.sectionType} ILIKE ${section_type as string}`);
  if (key) conditions.push(sql`${audioLoops.keySignature} ILIKE ${key as string}`);
  if (collection) conditions.push(eq(audioLoops.collection, collection as string));
  if (bpm_min) conditions.push(gte(audioLoops.bpm, Number(bpm_min)));
  if (bpm_max) conditions.push(lte(audioLoops.bpm, Number(bpm_max)));
  if (search) conditions.push(sql`(${audioLoops.title} ILIKE ${'%' + search + '%'} OR ${audioLoops.grooveName} ILIKE ${'%' + search + '%'} OR ${audioLoops.artist} ILIKE ${'%' + search + '%'} OR ${audioLoops.collection} ILIKE ${'%' + search + '%'})`);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Section-type ordering for collection grouping: intro → verse → chorus → fill → break → build → outro → full_loop
  const sectionOrder = sql`CASE LOWER(${audioLoops.sectionType})
    WHEN 'intro' THEN 1 WHEN 'verse' THEN 2 WHEN 'chorus' THEN 3
    WHEN 'fill' THEN 4 WHEN 'break' THEN 5 WHEN 'build' THEN 6
    WHEN 'outro' THEN 7 WHEN 'full_loop' THEN 8 ELSE 9 END`;

  // Instrument priority: drums first, then percussion, then everything else
  const instrumentPriority = sql`CASE LOWER(${audioLoops.instrumentCategory})
    WHEN 'drums' THEN 1 WHEN 'percussion' THEN 2 WHEN 'bass' THEN 3
    WHEN 'guitar' THEN 4 WHEN 'keys' THEN 5 WHEN 'electronic' THEN 6 ELSE 9 END`;

  const orderBy = sort === 'bpm_asc' ? [instrumentPriority, asc(audioLoops.bpm)]
    : sort === 'bpm_desc' ? [instrumentPriority, desc(audioLoops.bpm)]
    : sort === 'artist' ? [instrumentPriority, asc(audioLoops.artist)]
    : sort === 'most_played' ? [instrumentPriority, desc(audioLoops.playCount)]
    : sort === 'collection' ? [instrumentPriority, asc(audioLoops.artist), asc(audioLoops.collection), sectionOrder, asc(audioLoops.sectionNumber)]
    : sort === 'genre' ? [asc(audioLoops.genre), instrumentPriority, asc(audioLoops.artist)]
    : [instrumentPriority, desc(audioLoops.createdAt)];

  try {
    const [rows, countRow] = await Promise.all([
      db.select().from(audioLoops).where(where).orderBy(...orderBy).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(audioLoops).where(where),
    ]);

    res.json({ loops: rows, total: Number(countRow[0]?.count ?? 0), page, limit });
  } catch (err) {
    console.error("audio-loops query failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
