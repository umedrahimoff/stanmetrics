import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [countriesRes, stagesRes, roundTypesRes, yearsRes] = await Promise.all([
      pool.query(`
        SELECT DISTINCT value FROM (
          SELECT COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as value
          FROM investment_rounds r
          JOIN countries co ON co.id = r.country_id
          WHERE r.status_id = 1
          UNION
          SELECT COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as value
          FROM investment_rounds r
          JOIN companies c ON c.id = r.company_id
          JOIN countries co ON co.id = c.country_id
          WHERE r.status_id = 1
        ) u WHERE value IS NOT NULL
        ORDER BY value
      `),
      pool.query(`
        SELECT DISTINCT COALESCE(s.name_en, s.name) as value
        FROM investment_rounds r
        JOIN stages s ON s.id = r.stage_id
        WHERE r.status_id = 1
        ORDER BY value
      `),
      pool.query(`
        SELECT DISTINCT irt.name as value
        FROM investment_rounds r
        JOIN investment_round_types irt ON irt.id = r.investment_round_type_id
        WHERE r.status_id = 1
        ORDER BY value
      `),
      pool.query(`
        SELECT DISTINCT EXTRACT(YEAR FROM r.date)::int as value
        FROM investment_rounds r
        WHERE r.status_id = 1 AND r.date IS NOT NULL
        ORDER BY value DESC
      `),
    ]);

    const countries = countriesRes.rows.map((r) => ({ value: r.value, label: r.value }));
    const stages = stagesRes.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value }));
    const roundTypes = roundTypesRes.rows.filter((r) => r.value).map((r) => ({ value: r.value, label: r.value }));
    const years = yearsRes.rows.filter((r) => r.value).map((r) => ({ value: String(r.value), label: String(r.value) }));

    return NextResponse.json({
      country: countries,
      stage: stages,
      round_type: roundTypes,
      year: years,
    });
  } catch (error) {
    console.error("Investment rounds filters error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
