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
    const cityParam = searchParams.get("city") || "";
    const cities = cityParam ? cityParam.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const typeParam = searchParams.get("type") || "";
    const types = typeParam ? typeParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const founded = searchParams.get("founded") || "";

    const conditions: string[] = ["i.deleted_at IS NULL"];
    const filterValues: (string | number | string[])[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(
        `(i.name ILIKE $${paramIdx} OR COALESCE(i.short_description->>'en', i.description->>'en') ILIKE $${paramIdx})`
      );
      filterValues.push(`%${search}%`);
      paramIdx++;
    }
    if (countries.length > 0) {
      conditions.push(
        `(co.name->>'en' = ANY($${paramIdx}::text[]) OR co.name->>'ru' = ANY($${paramIdx}::text[]))`
      );
      filterValues.push(countries);
      paramIdx++;
    }
    if (cities.length > 0) {
      conditions.push(
        `(COALESCE(ci.name->>'en', ci.name->>'ru', ci.name::text) = ANY($${paramIdx}::text[]))`
      );
      filterValues.push(cities);
      paramIdx++;
    }
    if (types.length > 0) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM type_of_investors toi
          JOIN investor_types it ON it.id = toi.investor_type_id
          WHERE toi.investor_id = i.id
          AND (it.name->>'en' = ANY($${paramIdx}::text[]) OR it.name->>'ru' = ANY($${paramIdx}::text[]))
        )`
      );
      filterValues.push(types);
      paramIdx++;
    }
    if (founded) {
      conditions.push(`i.founded_year = $${paramIdx}`);
      filterValues.push(parseInt(founded, 10));
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");
    const mainValues = [...filterValues, limit, offset];
    const limitParamIdx = filterValues.length + 1;

    const countResult = await pool.query({
      text: `
      SELECT COUNT(*) as total FROM investors i
      LEFT JOIN countries co ON co.id = i.country_id
      LEFT JOIN cities ci ON ci.id = i.city_id
      WHERE ${whereClause}
    `,
      values: filterValues,
    });
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const result = await pool.query({
      text: `
      SELECT 
        i.id,
        i.name,
        i.founded_year,
        COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as country,
        COALESCE(ci.name->>'en', ci.name->>'ru', ci.name::text) as city,
        (
          SELECT string_agg(DISTINCT COALESCE(it.name->>'en', it.name->>'ru', it.name::text), ', ')
          FROM type_of_investors toi
          JOIN investor_types it ON it.id = toi.investor_type_id
          WHERE toi.investor_id = i.id
        ) as type,
        i.created_at,
        o.slug
      FROM investors i
      LEFT JOIN (SELECT organization_id, slug FROM organizations WHERE organization_type = 'App\\Models\\Investor' AND deleted_at IS NULL) o ON o.organization_id::bigint = i.id
      LEFT JOIN countries co ON co.id = i.country_id
      LEFT JOIN cities ci ON ci.id = i.city_id
      WHERE ${whereClause}
      ORDER BY i.id
      LIMIT $${limitParamIdx} OFFSET $${limitParamIdx + 1}
    `,
      values: mainValues,
    });

    const rows = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      stanbase_url: r.slug ? `https://stanbase.tech/investors/${r.slug}` : null,
      founded: r.founded_year,
      country: r.country,
      city: r.city,
      type: r.type,
      created: r.created_at
        ? new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
        : null,
    }));

    if (format === "csv") {
      const cols = ["id", "name", "stanbase_url", "founded", "country", "city", "type", "created"];
      const escape = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = cols.join(",");
      const lines = rows.map((r) => cols.map((c) => escape((r as Record<string, unknown>)[c])).join(","));
      const csv = [header, ...lines].join("\n");
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="investors.csv"' },
      });
    }

    return NextResponse.json({ rows, total, limit, offset });
  } catch (error) {
    console.error("Investors error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
