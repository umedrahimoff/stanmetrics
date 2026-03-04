import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [countriesRes, yearsRes] = await Promise.all([
      pool.query(`
        SELECT DISTINCT COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as value
        FROM companies c
        JOIN countries co ON co.id = c.country_id
        WHERE c.deleted_at IS NULL
        UNION
        SELECT DISTINCT COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as value
        FROM investors i
        JOIN countries co ON co.id = i.country_id
        WHERE i.deleted_at IS NULL
        ORDER BY value
      `),
      pool.query(`
        SELECT DISTINCT EXTRACT(YEAR FROM date)::int as value
        FROM investment_rounds
        WHERE status_id = 1 AND date IS NOT NULL
        ORDER BY value DESC
      `),
    ]);
    const country = countriesRes.rows.filter((r) => r.value).map((r) => ({ value: String(r.value), label: String(r.value) }));
    const year = yearsRes.rows.filter((r) => r.value).map((r) => ({ value: String(r.value), label: String(r.value) }));
    return NextResponse.json({ country, year });
  } catch (error) {
    console.error("Dashboard filters error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
