import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM date)::int as year,
        COUNT(*) as rounds_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM investment_rounds 
      WHERE status_id = 1 AND date IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM date)
      ORDER BY year ASC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Funding by year error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
