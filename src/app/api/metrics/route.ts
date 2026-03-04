import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL) as companies,
        (SELECT COUNT(*) FROM investors WHERE deleted_at IS NULL) as investors,
        (SELECT COUNT(*) FROM investment_rounds WHERE status_id = 1) as rounds,
        (SELECT COALESCE(SUM(amount), 0) FROM investment_rounds WHERE status_id = 1 AND amount IS NOT NULL) as total_funding,
        (SELECT COUNT(*) FROM news WHERE status_id = 1) as news,
        (SELECT COUNT(*) FROM events WHERE status_id = 1) as events
    `);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Database error";
    console.error("Metrics error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
