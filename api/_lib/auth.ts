import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "groovelab-dev-secret";

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, SECRET);
}

export function getTokenFromCookies(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/gl_token=([^;]+)/);
  return match ? match[1] : null;
}

export function setTokenCookie(
  res: { setHeader: (name: string, value: string) => void },
  token: string,
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const cookie = [
    `gl_token=${token}`,
    "Path=/",
    "HttpOnly",
    `SameSite=Lax`,
    `Max-Age=${7 * 24 * 60 * 60}`,
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function clearTokenCookie(
  res: { setHeader: (name: string, value: string) => void },
): void {
  const cookie = "gl_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  res.setHeader("Set-Cookie", cookie);
}
