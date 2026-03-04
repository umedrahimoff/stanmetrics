import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country") || "";
    const countries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];

    const countryWhere =
      countries.length
        ? `AND (c.country_id IN (SELECT id FROM countries WHERE name->>'en' = ANY($1::text[]) OR name->>'ru' = ANY($1::text[])))`
        : "";

    const result = await pool.query({
      text: `
      SELECT 
        c.name,
        c.website,
        COALESCE(SUM(r.amount), 0) as total_funding,
        COUNT(r.id) as rounds_count
      FROM companies c
      JOIN investment_rounds r ON r.company_id = c.id AND r.status_id = 1
      WHERE c.deleted_at IS NULL ${countryWhere}
      GROUP BY c.id, c.name, c.website
      ORDER BY total_funding DESC
      LIMIT 10
    `,
      values: countries.length ? [countries] : [],
    });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Top companies error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
