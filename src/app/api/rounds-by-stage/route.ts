import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        COALESCE(s.name_en, s.name) as name,
        COUNT(r.id) as rounds_count,
        COALESCE(SUM(r.amount), 0) as total_amount
      FROM stages s
      LEFT JOIN investment_rounds r ON r.stage_id = s.id AND r.status_id = 1
      GROUP BY s.id, s.name, s.name_en
      HAVING COUNT(r.id) > 0
      ORDER BY rounds_count DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Rounds by stage error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
