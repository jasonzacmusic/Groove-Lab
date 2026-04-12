import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { clearTokenCookie } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  clearTokenCookie(res);
  return res.status(200).json({ success: true });
}
