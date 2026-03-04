import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country") || "";
    const selectedCountries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];

    const citiesCondition = selectedCountries.length > 0
      ? `AND (co.name->>'en' = ANY($1::text[]) OR co.name->>'ru' = ANY($1::text[]))`
      : "";
    const citiesValues = selectedCountries.length > 0 ? [selectedCountries] : [];

    const [countriesRes, stages, citiesRes, years] = await Promise.all([
      pool.query(`
        SELECT DISTINCT COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as value
        FROM companies c
        JOIN countries co ON co.id = c.country_id
        WHERE c.deleted_at IS NULL
        ORDER BY value
      `),
      pool.query(`
        SELECT DISTINCT COALESCE(s.name_en, s.name) as value
        FROM companies c
        JOIN stages s ON s.id = c.stage_id
        WHERE c.deleted_at IS NULL
        ORDER BY value
      `),
      pool.query(
        {
          text: `
        SELECT DISTINCT COALESCE(ci.name->>'en', ci.name->>'ru', ci.name::text) as value
        FROM companies c
        JOIN cities ci ON ci.id = c.city_id
        JOIN countries co ON co.id = c.country_id
        WHERE c.deleted_at IS NULL AND ci.name IS NOT NULL ${citiesCondition}
        ORDER BY value
      `,
          values: citiesValues,
        }
      ),
      pool.query(`
        SELECT DISTINCT c.founded as value FROM companies c
        WHERE c.deleted_at IS NULL AND c.founded IS NOT NULL
        ORDER BY c.founded DESC
      `),
    ]);

    return NextResponse.json({
      country: countriesRes.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value })),
      stage: stages.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value })),
      city: citiesRes.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value })),
      founded: years.rows.filter((r) => r.value).map((r) => ({ value: String(r.value), label: String(r.value) })),
    });
  } catch (error) {
    console.error("Companies filters error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
