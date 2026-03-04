import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country") || "";
    const countries = countryParam ? countryParam.split(",").map((c) => c.trim()).filter(Boolean) : [];

    const countrySub = countries.length
      ? `(SELECT id FROM countries WHERE name->>'en' = ANY($1::text[]) OR name->>'ru' = ANY($1::text[]))`
      : "";
    const companiesWhere = countries.length ? `AND c.country_id IN ${countrySub}` : "";
    const investorsWhere = countries.length ? `AND i.country_id IN ${countrySub}` : "";
    const roundsWhere = countries.length
      ? `AND (r.country_id IN ${countrySub} OR r.company_id IN (SELECT id FROM companies WHERE country_id IN ${countrySub}))`
      : "";

    const values = countries.length ? [countries] : [];
    const result = await pool.query({
      text: `
      SELECT 
        (SELECT COUNT(*) FROM companies c WHERE c.deleted_at IS NULL ${companiesWhere}) as companies,
        (SELECT COUNT(*) FROM investors i WHERE i.deleted_at IS NULL ${investorsWhere}) as investors,
        (SELECT COUNT(*) FROM investment_rounds r WHERE r.status_id = 1 ${roundsWhere}) as rounds,
        (SELECT COALESCE(SUM(r.amount), 0) FROM investment_rounds r WHERE r.status_id = 1 AND r.amount IS NOT NULL ${roundsWhere}) as total_funding,
        (SELECT COUNT(*) FROM news WHERE status_id = 1) as news,
        (SELECT COUNT(*) FROM events WHERE status_id = 1) as events
    `,
      values,
    });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Database error";
    console.error("Metrics error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
