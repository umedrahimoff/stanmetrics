import { NextResponse } from "next/server";

export async function GET() {
  const fallback = process.env.TELEGRAM_BOT_USERNAME || "stanmetricsbot";
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ username: fallback });
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    return NextResponse.json({ username: data.result?.username || fallback });
  } catch {
    return NextResponse.json({ username: fallback });
  }
}
