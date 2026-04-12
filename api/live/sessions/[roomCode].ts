import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../../_lib/cors";
import { db, liveSessions, sessionParticipants, eq, sql } from "../../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const roomCode = req.query.roomCode as string;
  if (!roomCode) return res.status(400).json({ error: "Missing roomCode" });

  const [session] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.roomCode, roomCode));

  if (!session) return res.status(404).json({ error: "Session not found" });

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, session.id));

  res.json({
    id: session.id,
    roomCode: session.roomCode,
    teacherId: session.teacherId ?? null,
    title: session.title ?? null,
    isActive: session.isActive,
    currentLoopId: session.currentLoopId ?? null,
    currentTempo: session.currentTempo ?? null,
    participantCount: Number(countRow?.count ?? 0),
    createdAt: session.createdAt.toISOString(),
  });
}
