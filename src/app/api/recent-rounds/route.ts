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
    const countryWhere = countries.length
      ? `AND (r.country_id IN ${countrySub} OR r.company_id IN (SELECT id FROM companies WHERE country_id IN ${countrySub}))`
      : "";

    const result = await pool.query({
      text: `
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
      WHERE r.status_id = 1 ${countryWhere}
      ORDER BY r.date DESC NULLS LAST
      LIMIT 15
    `,
      values: countries.length ? [countries] : [],
    });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Recent rounds error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
