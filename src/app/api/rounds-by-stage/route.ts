import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country") || "";
    const countries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];

    const countrySub = countries.length
      ? `(SELECT id FROM countries WHERE COALESCE(name->>'en', name->>'ru', name::text) = ANY($1::text[]))`
      : "";
    const roundsExtra = countries.length
      ? ` AND (r.country_id IN ${countrySub} OR r.company_id IN (SELECT id FROM companies WHERE country_id IN ${countrySub}))`
      : "";

    const result = await pool.query({
      text: `
      SELECT 
        s.id,
        COALESCE(s.name_en, s.name) as name,
        COUNT(r.id) as rounds_count,
        COALESCE(SUM(r.amount), 0) as total_amount
      FROM stages s
      LEFT JOIN investment_rounds r ON r.stage_id = s.id AND r.status_id = 1${roundsExtra}
      GROUP BY s.id, s.name, s.name_en
      HAVING COUNT(r.id) > 0
      ORDER BY rounds_count DESC
    `,
      values: countries.length ? [countries] : [],
    });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Rounds by stage error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}
