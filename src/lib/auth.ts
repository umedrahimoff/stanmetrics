import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHmac, createHash } from "crypto";

const COOKIE_NAME = "stanmetrics_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface TelegramAuth {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface SessionUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export function verifyTelegramAuth(auth: TelegramAuth, botToken: string): boolean {
  const { hash, ...data } = auth;
  const dataCheckString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${(data as Record<string, unknown>)[k]}`)
    .join("\n");
  const secretKey = createHash("sha256").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computedHash !== hash) return false;
  // Check auth_date is not older than 1 day
  const now = Math.floor(Date.now() / 1000);
  if (now - auth.auth_date > 86400) return false;
  return true;
}

export async function createSession(user: SessionUser): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "stanmetrics-secret-change-me");
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "stanmetrics-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    return (payload.user as SessionUser) ?? null;
  } catch {
    return null;
  }
}

export function getCookieConfig() {
  return {
    name: COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: MAX_AGE,
      path: "/",
    },
  };
}
