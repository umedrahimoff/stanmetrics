import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  try {
    const body = await req.json();
    const message = body.message;
    if (!message?.text?.startsWith("/start ")) {
      return NextResponse.json({ ok: true });
    }
    const startToken = message.text.slice(7).trim();
    const from = message.from;
    if (!from?.id || !startToken) {
      return NextResponse.json({ ok: true });
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stanmetrics.vercel.app";
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${startToken}`;

    const result = await pool.query(
      `UPDATE auth_tokens 
       SET telegram_user_id = $1, first_name = $2, last_name = $3, username = $4 
       WHERE token = $5 AND telegram_user_id IS NULL AND expires_at > NOW()
       RETURNING token`,
      [from.id, from.first_name || "", from.last_name || "", from.username || "", startToken]
    );

    if (!result.rows.length) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: "This link has expired or was already used. Please go back to the website and try again.",
        }),
      });
      return NextResponse.json({ ok: true });
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: "✅ Verification successful! Click the link below to complete login:",
        reply_markup: {
          inline_keyboard: [[{ text: "Open Stanmetrics", url: verifyUrl }]],
        },
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
