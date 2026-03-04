import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { randomBytes } from "crypto";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "stanmetricsbot";

export async function GET() {
  const token = randomBytes(24).toString("hex");
  try {
    await pool.query(
      `INSERT INTO auth_tokens (token) VALUES ($1)`,
      [token]
    );
  } catch (e) {
    console.error("Auth start error:", e);
    return NextResponse.redirect(new URL("/login?error=start", "/"));
  }
  const botUrl = `https://t.me/${BOT_USERNAME}?start=${token}`;
  return NextResponse.redirect(botUrl);
}
