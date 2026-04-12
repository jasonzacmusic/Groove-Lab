import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db } from "../_lib/db";
import { practiceLogs } from "../_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, loopId, durationSeconds, bpmPracticed } = req.body;
  if (!userId || !durationSeconds) return res.status(400).json({ error: "userId and durationSeconds required" });

  await db.insert(practiceLogs).values({
    userId,
    loopId: loopId ?? null,
    durationSeconds,
    bpmPracticed: bpmPracticed ?? null,
  });

  res.status(201).json({ success: true });
}
