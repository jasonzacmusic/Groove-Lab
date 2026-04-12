import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../../_lib/cors";
import { db, liveSessions, eq } from "../../_lib/db";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (cors(req, res)) return;
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const { teacherId, title } = req.body ?? {};

  let roomCode = generateRoomCode();
  let existing = await db.select().from(liveSessions).where(eq(liveSessions.roomCode, roomCode));
  let attempts = 0;
  while (existing.length > 0 && attempts < 10) {
    roomCode = generateRoomCode();
    existing = await db.select().from(liveSessions).where(eq(liveSessions.roomCode, roomCode));
    attempts++;
  }

  const [session] = await db
    .insert(liveSessions)
    .values({ roomCode, teacherId: teacherId ?? null, title: title ?? null, isActive: true })
    .returning();

  res.status(201).json({
    id: session.id,
    roomCode: session.roomCode,
    teacherId: session.teacherId ?? null,
    title: session.title ?? null,
    isActive: session.isActive,
    currentLoopId: session.currentLoopId ?? null,
    currentTempo: session.currentTempo ?? null,
    participantCount: 0,
    createdAt: session.createdAt.toISOString(),
  });
}
