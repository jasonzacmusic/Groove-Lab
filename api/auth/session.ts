import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { db, users, eq } from "../_lib/db";
import { verifyToken, getTokenFromCookies } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getTokenFromCookies(req.headers.cookie);
  if (!token) {
    return res.status(200).json({ user: null });
  }

  try {
    const payload = verifyToken(token);
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        ageGroup: users.ageGroup,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return res.status(200).json({ user: null });
    }

    return res.status(200).json({ user });
  } catch {
    return res.status(200).json({ user: null });
  }
}
