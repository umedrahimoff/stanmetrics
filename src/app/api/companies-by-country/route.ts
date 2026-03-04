import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country") || "";
    const countries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];

    const countryFilter =
      countries.length
        ? `AND (c.name->>'en' = ANY($1::text[]) OR c.name->>'ru' = ANY($1::text[]))`
        : "";

    const result = await pool.query({
      text: `
      SELECT 
        c.id,
        COALESCE(c.name->>'en', c.name->>'ru', c.name::text) as name,
        COUNT(comp.id)::int as companies_count
      FROM countries c
      LEFT JOIN companies comp ON comp.country_id = c.id AND comp.deleted_at IS NULL
      WHERE c.status_id = 1 ${countryFilter}
      GROUP BY c.id, COALESCE(c.name->>'en', c.name->>'ru', c.name::text)
      HAVING COUNT(comp.id) > 0
      ORDER BY companies_count DESC
      LIMIT 15
    `,
      values: countries.length ? [countries] : [],
    });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Companies by country error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
