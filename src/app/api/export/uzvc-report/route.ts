import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { UZVC_FIELDS_SELECTABLE, UZVC_LINK_FIELD } from "@/lib/uzvc-fields";

const UZBEKISTAN_NAMES = ["Uzbekistan", "Узбекистан"];

const ALL_FIELDS = [...UZVC_FIELDS_SELECTABLE, UZVC_LINK_FIELD];

function escapeCsv(v: string | null): string {
  if (v == null) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function formatAmount(n: number | null): string {
  if (n == null) return "";
  return Math.round(n).toLocaleString("en-US");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fieldsParam = searchParams.get("fields") || "";
    const requestedFields = fieldsParam
      ? fieldsParam.split(",").map((f) => f.trim()).filter(Boolean)
      : UZVC_FIELDS_SELECTABLE.map((f) => f.id);
    const validFields = requestedFields.filter((id) => UZVC_FIELDS_SELECTABLE.some((f) => f.id === id));
    const selectableFields = validFields.length > 0 ? validFields : UZVC_FIELDS_SELECTABLE.map((f) => f.id);
    const fields = [...selectableFields, UZVC_LINK_FIELD.id];

    const countrySub = `(SELECT id FROM countries WHERE COALESCE(name->>'en', name->>'ru', name::text) = ANY($1::text[]))`;
    const whereClause = `r.status_id = 1 AND (
      r.country_id IN ${countrySub}
      OR r.company_id IN (SELECT id FROM companies WHERE country_id IN ${countrySub})
    )`;

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
      LIMIT 10
    `,
      values: [UZBEKISTAN_NAMES],
    });
    const rows = result.rows;

    const fieldLabels = Object.fromEntries(ALL_FIELDS.map((f) => [f.id, f.label]));
    const cols = fields.map((id) => fieldLabels[id] || id);
    const header = cols.join(",");

    const lines = rows.map((r) => {
      const year = r.date ? new Date(r.date).getFullYear() : "";
      const amount = formatAmount(r.amount);
      const link = r.slug ? `https://stanbase.tech/funding-round/${r.slug}` : "";
      const values: Record<string, string> = {
        startup_name: escapeCsv(r.startup_name),
        project_sector: escapeCsv(r.project_sector),
        product_stage: escapeCsv(r.product_stage),
        venture_fund: escapeCsv(r.venture_fund),
        amount: escapeCsv(amount),
        year: escapeCsv(String(year)),
        link: escapeCsv(link),
      };
      return fields.map((id) => values[id] ?? "").join(",");
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
