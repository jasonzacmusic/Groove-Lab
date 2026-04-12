import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../../../_lib/cors";
import { db, eq } from "../../../_lib/db";
import { liveSessions } from "../../../../lib/db/src/schema/groovelab";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;
  const roomCode = req.query.roomCode as string;

  if (req.method === "PUT") {
    // Teacher updates session state
    const { currentLoopId, currentTempo, isActive } = req.body;
    await db.update(liveSessions)
      .set({
        currentLoopId: currentLoopId ?? null,
        currentTempo: currentTempo ?? null,
        isActive: isActive ?? true,
      })
      .where(eq(liveSessions.roomCode, roomCode));
    res.json({ success: true });
    return;
  }

  // GET - students poll this
  const [session] = await db.select().from(liveSessions)
    .where(eq(liveSessions.roomCode, roomCode));
  if (!session) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    currentLoopId: session.currentLoopId,
    currentTempo: session.currentTempo,
    isActive: session.isActive,
  });
}
