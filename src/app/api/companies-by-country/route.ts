import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        COALESCE(c.name->>'en', c.name->>'ru', c.name::text) as name,
        COUNT(comp.id)::int as companies_count
      FROM countries c
      LEFT JOIN companies comp ON comp.country_id = c.id AND comp.deleted_at IS NULL
      WHERE c.status_id = 1
      GROUP BY c.id, COALESCE(c.name->>'en', c.name->>'ru', c.name::text)
      HAVING COUNT(comp.id) > 0
      ORDER BY companies_count DESC
      LIMIT 15
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Companies by country error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
