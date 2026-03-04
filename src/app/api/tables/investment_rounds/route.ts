import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "";
    const maxLimit = format === "csv" ? 10 : 500;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), maxLimit);
    const offset = format === "csv" ? 0 : parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const countryParam = searchParams.get("country") || "";
    const countries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const stageParam = searchParams.get("stage") || "";
    const stages = stageParam ? stageParam.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const roundTypeParam = searchParams.get("round_type") || "";
    const roundTypes = roundTypeParam ? roundTypeParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const year = searchParams.get("year") || "";

    const conditions: string[] = ["r.status_id = 1"];
    const filterValues: (string | number | string[])[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(
        `(COALESCE(r.company_name, c.name) ILIKE $${paramIdx})`
      );
      filterValues.push(`%${search}%`);
      paramIdx++;
    }
    if (countries.length > 0) {
      conditions.push(
        `((co.name->>'en' = ANY($${paramIdx}::text[]) OR co.name->>'ru' = ANY($${paramIdx}::text[])) OR (co_c.name->>'en' = ANY($${paramIdx}::text[]) OR co_c.name->>'ru' = ANY($${paramIdx}::text[])))`
      );
      filterValues.push(countries);
      paramIdx++;
    }
    if (stages.length > 0) {
      conditions.push(
        `(COALESCE(s.name_en, s.name) = ANY($${paramIdx}::text[]))`
      );
      filterValues.push(stages);
      paramIdx++;
    }
    if (roundTypes.length > 0) {
      conditions.push(`(irt.name = ANY($${paramIdx}::text[]))`);
      filterValues.push(roundTypes);
      paramIdx++;
    }
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM r.date) = $${paramIdx}`);
      filterValues.push(parseInt(year, 10));
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");
    const mainValues = [...filterValues, limit, offset];
    const limitParamIdx = filterValues.length + 1;

    const countResult = await pool.query({
      text: `
      SELECT COUNT(*) as total FROM investment_rounds r
      LEFT JOIN companies c ON c.id = r.company_id
      LEFT JOIN countries co ON co.id = r.country_id
      LEFT JOIN countries co_c ON co_c.id = c.country_id
      LEFT JOIN stages s ON s.id = r.stage_id
      LEFT JOIN investment_round_types irt ON irt.id = r.investment_round_type_id
      WHERE ${whereClause}
    `,
      values: filterValues,
    });
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const result = await pool.query({
      text: `
      SELECT 
        r.id,
        r.slug,
        r.date,
        COALESCE(r.company_name, c.name) as company_name,
        r.amount,
        r.valuation,
        COALESCE(s.name_en, s.name) as stage,
        irt.name as round_type,
        COALESCE(co.name->>'en', co.name->>'ru', co.name::text, co_c.name->>'en', co_c.name->>'ru', co_c.name::text) as country,
        o.slug as company_slug,
        (
          SELECT json_agg(json_build_object('name', n, 'url', url) ORDER BY n)
          FROM (
            SELECT i.name as n,
              CASE WHEN o.slug IS NOT NULL THEN 'https://stanbase.tech/investors/' || o.slug ELSE NULL END as url
            FROM investment_round_investor iri
            JOIN investors i ON i.id = iri.investor_id AND i.deleted_at IS NULL
            LEFT JOIN (SELECT organization_id, slug FROM organizations WHERE organization_type = 'App\\Models\\Investor' AND deleted_at IS NULL) o ON o.organization_id::bigint = i.id
            WHERE iri.investment_round_id = r.id
            UNION ALL
            SELECT ei.name as n, NULL::text as url
            FROM external_investors ei
            WHERE ei.investment_round_id = r.id
          ) u
        ) as investors
      FROM investment_rounds r
      LEFT JOIN companies c ON c.id = r.company_id
      LEFT JOIN countries co ON co.id = r.country_id
      LEFT JOIN countries co_c ON co_c.id = c.country_id
      LEFT JOIN stages s ON s.id = r.stage_id
      LEFT JOIN investment_round_types irt ON irt.id = r.investment_round_type_id
      LEFT JOIN (SELECT organization_id, slug FROM organizations WHERE organization_type = 'App\\Models\\Company' AND deleted_at IS NULL) o ON o.organization_id::bigint = c.id
      WHERE ${whereClause}
      ORDER BY r.date DESC NULLS LAST, r.id
      LIMIT $${limitParamIdx} OFFSET $${limitParamIdx + 1}
    `,
      values: mainValues,
    });

    const formatAmount = (v: number | null) =>
      v != null ? `$${v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v}` : null;

    const rows = result.rows.map((r) => ({
      id: r.id,
      date: r.date ? new Date(r.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null,
      company_name: r.company_name,
      company_url: r.company_slug ? `https://stanbase.tech/companies/${r.company_slug}` : null,
      round_url: r.slug ? `https://stanbase.tech/funding-round/${r.slug}` : null,
      amount: formatAmount(r.amount),
      valuation: formatAmount(r.valuation),
      stage: r.stage,
      round_type: r.round_type,
      investors: r.investors,
      country: r.country,
    }));

    if (format === "csv") {
      const cols = ["id", "date", "company_name", "company_url", "round_url", "amount", "valuation", "stage", "round_type", "investors", "country"];
      const escape = (v: unknown) => {
        if (Array.isArray(v)) {
          const names = (v as { name: string }[]).map((x) => x.name).join("; ");
          return names.includes(",") || names.includes('"') || names.includes("\n") ? `"${names.replace(/"/g, '""')}"` : names;
        }
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = cols.join(",");
      const lines = rows.map((r) => cols.map((c) => escape((r as Record<string, unknown>)[c])).join(","));
      const csv = [header, ...lines].join("\n");
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="rounds.csv"' },
      });
    }

    return NextResponse.json({ rows, total, limit, offset });
  } catch (error) {
    console.error("Investment rounds error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
