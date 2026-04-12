import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { cors } from "../_lib/cors";
import { db, users, eq } from "../_lib/db";
import { signToken, setTokenCookie } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      name: name || null,
      passwordHash,
    })
    .onConflictDoNothing({ target: users.email })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  if (result.length === 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const user = result[0];
  const token = signToken({ userId: user.id, email: user.email });
  setTokenCookie(res, token);

  return res.status(201).json({ user });
}
