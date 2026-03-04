import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(r.company_name, c.name) as company_name,
        r.amount,
        r.date,
        COALESCE(s.name_en, s.name) as stage,
        COALESCE(irt.name, 'N/A') as round_type
      FROM investment_rounds r
      LEFT JOIN companies c ON c.id = r.company_id
      LEFT JOIN stages s ON s.id = r.stage_id
      LEFT JOIN investment_round_types irt ON irt.id = r.investment_round_type_id
      WHERE r.status_id = 1
      ORDER BY r.date DESC NULLS LAST
      LIMIT 15
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Recent rounds error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
