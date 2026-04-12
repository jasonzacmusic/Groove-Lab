import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, eq, sql } from "../_lib/db";
import { audioLoops } from "../../lib/db/src/schema/groovelab";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;

  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  if (req.method === "POST") {
    // Increment play count
    const [updated] = await db
      .update(audioLoops)
      .set({ playCount: sql`${audioLoops.playCount} + 1` })
      .where(eq(audioLoops.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Audio loop not found" });
      return;
    }

    res.json(updated);
    return;
  }

  // GET single loop
  const [loop] = await db.select().from(audioLoops).where(eq(audioLoops.id, id));
  if (!loop) {
    res.status(404).json({ error: "Audio loop not found" });
    return;
  }

  res.json(loop);
}
