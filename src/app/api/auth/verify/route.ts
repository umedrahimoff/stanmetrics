import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { createSession, getCookieConfig } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  }
  try {
    const result = await pool.query(
      `SELECT telegram_user_id, first_name, last_name, username 
       FROM auth_tokens 
       WHERE token = $1 AND telegram_user_id IS NOT NULL AND expires_at > NOW()`,
      [token]
    );
    if (!result.rows.length) {
      return NextResponse.redirect(new URL("/login?error=expired", req.url));
    }
    const row = result.rows[0];
    const user = {
      id: Number(row.telegram_user_id),
      firstName: row.first_name || "",
      lastName: row.last_name,
      username: row.username,
    };
    const jwt = await createSession(user);
    const { name, options } = getCookieConfig();
    await pool.query(`DELETE FROM auth_tokens WHERE token = $1`, [token]);
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(name, jwt, options);
    return res;
  } catch (e) {
    console.error("Auth verify error:", e);
    return NextResponse.redirect(new URL("/login?error=auth", req.url));
  }
}
