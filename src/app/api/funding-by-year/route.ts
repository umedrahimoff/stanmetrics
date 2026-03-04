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
    const roundsWhere = countries.length
      ? `AND (r.country_id IN ${countrySub} OR r.company_id IN (SELECT id FROM companies WHERE country_id IN ${countrySub}))`
      : "";

    const result = await pool.query({
      text: `
      SELECT 
        TO_CHAR(DATE_TRUNC('month', r.date), 'Mon YYYY') as month_year,
        EXTRACT(YEAR FROM r.date)::int as year,
        EXTRACT(MONTH FROM r.date)::int as month,
        COUNT(*) as rounds_count,
        COALESCE(SUM(r.amount), 0) as total_amount
      FROM investment_rounds r
      WHERE r.status_id = 1 AND r.date IS NOT NULL ${roundsWhere}
      GROUP BY EXTRACT(YEAR FROM r.date), EXTRACT(MONTH FROM r.date)
      ORDER BY year DESC, month DESC
      LIMIT 24
    `,
      values: countries.length ? [countries] : [],
    });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Funding by year error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
