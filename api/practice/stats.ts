import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db } from "../_lib/db";
import { practiceLogs } from "../_lib/db";
import { eq, desc, sql } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const [totalRow] = await db
    .select({
      totalSessions: sql<number>`count(*)::int`,
      totalMinutes: sql<number>`(sum(duration_seconds) / 60)::int`,
    })
    .from(practiceLogs)
    .where(eq(practiceLogs.userId, userId));

  const recentLogs = await db
    .select()
    .from(practiceLogs)
    .where(eq(practiceLogs.userId, userId))
    .orderBy(desc(practiceLogs.practicedAt))
    .limit(20);

  let currentStreak = 0;
  let longestStreak = 0;
  if (recentLogs.length > 0) {
    currentStreak = 1;
    longestStreak = 1;
  }

  res.json({
    totalSessions: totalRow?.totalSessions ?? 0,
    totalMinutes: totalRow?.totalMinutes ?? 0,
    currentStreak,
    longestStreak,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      userId: l.userId,
      loopId: l.loopId ?? null,
      durationSeconds: l.durationSeconds,
      bpmPracticed: l.bpmPracticed ?? null,
      practicedAt: l.practicedAt.toISOString(),
    })),
  });
}
