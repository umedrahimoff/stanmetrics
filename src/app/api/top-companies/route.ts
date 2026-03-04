import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        c.name,
        c.website,
        COALESCE(SUM(r.amount), 0) as total_funding,
        COUNT(r.id) as rounds_count
      FROM companies c
      JOIN investment_rounds r ON r.company_id = c.id AND r.status_id = 1
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.website
      ORDER BY total_funding DESC
      LIMIT 10
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Top companies error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
