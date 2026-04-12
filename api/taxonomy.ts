import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "./_lib/cors";
import { db } from "@workspace/db";
import { timeSignatures, feels, genres, instrumentTypes, contentTypes } from "@workspace/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const [ts, f, g, it, ct] = await Promise.all([
    db.select().from(timeSignatures).orderBy(timeSignatures.sortOrder),
    db.select().from(feels).orderBy(feels.sortOrder),
    db.select().from(genres).orderBy(genres.sortOrder),
    db.select().from(instrumentTypes).orderBy(instrumentTypes.sortOrder),
    db.select().from(contentTypes).orderBy(contentTypes.sortOrder),
  ]);

  res.json({ timeSignatures: ts, feels: f, genres: g, instrumentTypes: it, contentTypes: ct });
}
