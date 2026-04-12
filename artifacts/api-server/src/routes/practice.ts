import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { practiceLogs } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  LogPracticeBody,
  GetPracticeStatsQueryParams,
  GetPracticeStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/practice/log", async (req, res): Promise<void> => {
  const parsed = LogPracticeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(practiceLogs).values({
    userId: parsed.data.userId,
    loopId: parsed.data.loopId ?? null,
    durationSeconds: parsed.data.durationSeconds,
    bpmPracticed: parsed.data.bpmPracticed ?? null,
  });

  res.status(201).json({ success: true });
});

router.get("/practice/stats", async (req, res): Promise<void> => {
  const parsed = GetPracticeStatsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = parsed.data;

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

  // Simplified streak calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  let longestStreak = 0;

  if (recentLogs.length > 0) {
    currentStreak = 1;
    longestStreak = 1;
  }

  res.json(
    GetPracticeStatsResponse.parse({
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
    }),
  );
});

export default router;
