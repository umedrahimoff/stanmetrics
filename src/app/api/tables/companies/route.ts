import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const countryParam = searchParams.get("country") || "";
    const countries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const stage = searchParams.get("stage") || "";
    const cityParam = searchParams.get("city") || "";
    const cities = cityParam ? cityParam.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const founded = searchParams.get("founded") || "";

    const conditions: string[] = ["c.deleted_at IS NULL"];
    const filterValues: (string | number | string[])[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(c.name ILIKE $${paramIdx} OR COALESCE(c.short_description->>'en', c.description->>'en') ILIKE $${paramIdx})`);
      filterValues.push(`%${search}%`);
      paramIdx++;
    }
    if (countries.length > 0) {
      conditions.push(`(co.name->>'en' = ANY($${paramIdx}::text[]) OR co.name->>'ru' = ANY($${paramIdx}::text[]))`);
      filterValues.push(countries);
      paramIdx++;
    }
    if (stage) {
      conditions.push(`COALESCE(s.name_en, s.name) = $${paramIdx}`);
      filterValues.push(stage);
      paramIdx++;
    }
    if (cities.length > 0) {
      conditions.push(`(COALESCE(ci.name->>'en', ci.name->>'ru', ci.name::text) = ANY($${paramIdx}::text[]))`);
      filterValues.push(cities);
      paramIdx++;
    }
    if (founded) {
      conditions.push(`c.founded = $${paramIdx}`);
      filterValues.push(parseInt(founded, 10));
      paramIdx++;
    }

    const whereClause = conditions.join(" AND ");
    const mainValues = [...filterValues, limit, offset];
    const limitParamIdx = filterValues.length + 1;

    const countResult = await pool.query(
      {
        text: `
      SELECT COUNT(*) as total FROM companies c
      LEFT JOIN countries co ON co.id = c.country_id
      LEFT JOIN stages s ON s.id = c.stage_id
      LEFT JOIN cities ci ON ci.id = c.city_id
      WHERE ${whereClause}
    `,
        values: filterValues,
      }
    );
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const result = await pool.query(
      {
        text: `
      SELECT 
        c.id,
        c.name,
        c.founded,
        c.employees_count,
        COALESCE(co.name->>'en', co.name->>'ru', co.name::text) as country,
        COALESCE(s.name_en, s.name) as stage,
        COALESCE(ci.name->>'en', ci.name->>'ru', ci.name::text) as city,
        c.created_at,
        o.slug
      FROM companies c
      LEFT JOIN (SELECT organization_id, slug FROM organizations WHERE organization_type = 'App\\Models\\Company' AND deleted_at IS NULL) o ON o.organization_id::bigint = c.id
      LEFT JOIN countries co ON co.id = c.country_id
      LEFT JOIN stages s ON s.id = c.stage_id
      LEFT JOIN cities ci ON ci.id = c.city_id
      WHERE ${whereClause}
      ORDER BY c.id
      LIMIT $${limitParamIdx} OFFSET $${limitParamIdx + 1}
    `,
        values: mainValues,
      }
    );

    const rows = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      stanbase_url: r.slug ? `https://stanbase.tech/companies/${r.slug}` : null,
      founded: r.founded,
      employees: r.employees_count,
      country: r.country,
      stage: r.stage,
      city: r.city,
      created: r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null,
    }));

    return NextResponse.json({ rows, total, limit, offset });
  } catch (error) {
    console.error("Companies error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
