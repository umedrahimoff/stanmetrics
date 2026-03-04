import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const res = await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, db: res.rows.length > 0 ? "connected" : "empty" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Health check:", error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
