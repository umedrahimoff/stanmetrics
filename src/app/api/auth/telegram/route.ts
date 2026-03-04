import { NextResponse } from "next/server";
import { verifyTelegramAuth, createSession, getCookieConfig } from "@/lib/auth";
import type { TelegramAuth } from "@/lib/auth";

function parseAuthFromSearchParams(url: string): TelegramAuth | null {
  const params = new URL(url).searchParams;
  const id = params.get("id");
  const hash = params.get("hash");
  if (!id || !hash) return null;
  return {
    id: parseInt(id, 10),
    first_name: params.get("first_name") || "",
    last_name: params.get("last_name") || undefined,
    username: params.get("username") || undefined,
    photo_url: params.get("photo_url") || undefined,
    auth_date: parseInt(params.get("auth_date") || "0", 10),
    hash,
  };
}

export async function GET(req: Request) {
  try {
    const auth = parseAuthFromSearchParams(req.url);
    if (!auth) {
      return NextResponse.redirect(new URL("/login?error=invalid", req.url));
    }
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.redirect(new URL("/login?error=config", req.url));
    }
    if (!verifyTelegramAuth(auth, botToken)) {
      return NextResponse.redirect(new URL("/login?error=invalid", req.url));
    }
    const user = {
      id: auth.id,
      firstName: auth.first_name,
      lastName: auth.last_name,
      username: auth.username,
      photoUrl: auth.photo_url,
    };
    const token = await createSession(user);
    const { name, options } = getCookieConfig();
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(name, token, options);
    return res;
  } catch (e) {
    console.error("Telegram auth error:", e);
    return NextResponse.redirect(new URL("/login?error=auth", req.url));
  }
}
