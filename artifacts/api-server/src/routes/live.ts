import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { liveSessions, sessionParticipants } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateLiveSessionBody,
  GetLiveSessionParams,
  GetLiveSessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.post("/live/sessions", async (req, res): Promise<void> => {
  const parsed = CreateLiveSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let roomCode = generateRoomCode();
  // Ensure uniqueness
  let existing = await db.select().from(liveSessions).where(eq(liveSessions.roomCode, roomCode));
  let attempts = 0;
  while (existing.length > 0 && attempts < 10) {
    roomCode = generateRoomCode();
    existing = await db.select().from(liveSessions).where(eq(liveSessions.roomCode, roomCode));
    attempts++;
  }

  const [session] = await db
    .insert(liveSessions)
    .values({
      roomCode,
      teacherId: parsed.data.teacherId ?? null,
      title: parsed.data.title ?? null,
      isActive: true,
    })
    .returning();

  res.status(201).json(
    GetLiveSessionResponse.parse({
      id: session.id,
      roomCode: session.roomCode,
      teacherId: session.teacherId ?? null,
      title: session.title ?? null,
      isActive: session.isActive,
      currentLoopId: session.currentLoopId ?? null,
      currentTempo: session.currentTempo ?? null,
      participantCount: 0,
      createdAt: session.createdAt.toISOString(),
    }),
  );
});

router.get("/live/sessions/:roomCode", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.roomCode) ? req.params.roomCode[0] : req.params.roomCode;
  const params = GetLiveSessionParams.safeParse({ roomCode: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.roomCode, params.data.roomCode));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, session.id));

  res.json(
    GetLiveSessionResponse.parse({
      id: session.id,
      roomCode: session.roomCode,
      teacherId: session.teacherId ?? null,
      title: session.title ?? null,
      isActive: session.isActive,
      currentLoopId: session.currentLoopId ?? null,
      currentTempo: session.currentTempo ?? null,
      participantCount: Number(countRow?.count ?? 0),
      createdAt: session.createdAt.toISOString(),
    }),
  );
});

export default router;
