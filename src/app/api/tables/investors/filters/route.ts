import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country") || "";
    const selectedCountries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];

    const citiesCondition =
      selectedCountries.length > 0
        ? `AND (co.name->>'en' = ANY($1::text[]) OR co.name->>'ru' = ANY($1::text[]))`
        : "";
    const citiesValues = selectedCountries.length > 0 ? [selectedCountries] : [];

    const [countriesRes, citiesRes, typesRes, yearsRes] = await Promise.all([
      pool.query(`
        SELECT DISTINCT COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as value
        FROM investors i
        JOIN countries co ON co.id = i.country_id
        WHERE i.deleted_at IS NULL
        ORDER BY value
      `),
      pool.query({
        text: `
        SELECT DISTINCT COALESCE(ci.name->>'en', ci.name->>'ru', ci.name::text) as value
        FROM investors i
        JOIN cities ci ON ci.id = i.city_id
        JOIN countries co ON co.id = i.country_id
        WHERE i.deleted_at IS NULL AND ci.name IS NOT NULL ${citiesCondition}
        ORDER BY value
      `,
        values: citiesValues,
      }),
      pool.query(`
        SELECT DISTINCT COALESCE(it.name->>'en', it.name->>'ru', it.name::text) as value
        FROM investors i
        JOIN type_of_investors toi ON toi.investor_id = i.id
        JOIN investor_types it ON it.id = toi.investor_type_id
        WHERE i.deleted_at IS NULL
        ORDER BY value
      `),
      pool.query(`
        SELECT DISTINCT i.founded_year as value FROM investors i
        WHERE i.deleted_at IS NULL AND i.founded_year IS NOT NULL
        ORDER BY i.founded_year DESC
      `),
    ]);

    return NextResponse.json({
      country: countriesRes.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value })),
      city: citiesRes.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value })),
      type: typesRes.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value })),
      founded: yearsRes.rows.filter((r) => r.value).map((r) => ({ value: String(r.value), label: String(r.value) })),
    });
  } catch (error) {
    console.error("Investors filters error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
