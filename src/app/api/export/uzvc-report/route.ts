import { NextResponse } from "next/server";
import pool from "@/lib/db";

function escapeCsv(v: string | null): string {
  if (v == null) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country") || "";
    const countries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const yearParam = searchParams.get("year") || "";

    const conditions: string[] = ["r.status_id = 1"];
    const filterValues: (string | number | string[])[] = [];
    let paramIdx = 1;

    if (countries.length > 0) {
      conditions.push(
        `((co.name->>'en' = ANY($${paramIdx}::text[]) OR co.name->>'ru' = ANY($${paramIdx}::text[])) OR (co_c.name->>'en' = ANY($${paramIdx}::text[]) OR co_c.name->>'ru' = ANY($${paramIdx}::text[])))`
      );
      filterValues.push(countries);
      paramIdx++;
    }
    if (yearParam) {
      conditions.push(`EXTRACT(YEAR FROM r.date) = $${paramIdx}`);
      filterValues.push(parseInt(yearParam, 10));
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");

    const result = await pool.query({
      text: `
      SELECT 
        COALESCE(r.company_name, c.name) as startup_name,
        (
          SELECT string_agg(COALESCE(i.name_en, i.name), ', ')
          FROM json_array_elements(COALESCE(c.industries, '[]'::json)) elem,
          industries i
          WHERE i.id = (elem::text)::int
        ) as project_sector,
        r.amount,
        r.date,
        COALESCE(s.name_en, s.name) as product_stage,
        r.slug,
        (
          SELECT string_agg(n, ', ' ORDER BY n)
          FROM (
            SELECT i.name as n FROM investment_round_investor iri
            JOIN investors i ON i.id = iri.investor_id AND i.deleted_at IS NULL
            WHERE iri.investment_round_id = r.id
            UNION ALL
            SELECT ei.name as n FROM external_investors ei
            WHERE ei.investment_round_id = r.id
          ) u
        ) as venture_fund
      FROM investment_rounds r
      LEFT JOIN companies c ON c.id = r.company_id
      LEFT JOIN countries co ON co.id = r.country_id
      LEFT JOIN countries co_c ON co_c.id = c.country_id
      LEFT JOIN stages s ON s.id = COALESCE(r.stage_id, c.stage_id)
      WHERE ${whereClause}
      ORDER BY r.date DESC NULLS LAST, r.id
      LIMIT 10000
    `,
      values: filterValues,
    });
    const rows = result.rows;

    const cols = [
      "Startup project name",
      "Project sector",
      "Customer type",
      "Product stage",
      "Name of the venture fund that invested",
      "Investment amount",
      "Investment year",
      "Stanbase link",
    ];

    const header = cols.join(",");
    const lines = rows.map((r) => {
      const year = r.date ? new Date(r.date).getFullYear() : "";
      const amount = r.amount != null ? String(r.amount) : "";
      const link = r.slug ? `https://stanbase.tech/funding-round/${r.slug}` : "";
      return [
        escapeCsv(r.startup_name),
        escapeCsv(r.project_sector),
        "", // Customer type - not in schema
        escapeCsv(r.product_stage),
        escapeCsv(r.venture_fund),
        escapeCsv(amount),
        escapeCsv(String(year)),
        escapeCsv(link),
      ].join(",");
    });
    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="uzvc-report.csv"',
      },
    });
  } catch (error) {
    console.error("UzVC report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
