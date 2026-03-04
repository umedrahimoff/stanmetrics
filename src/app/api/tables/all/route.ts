import { NextResponse } from "next/server";
import pool from "@/lib/db";

const EXCLUDED = [
  "migrations",
  "cache",
  "cache_locks",
  "failed_jobs",
  "jobs",
  "job_batches",
  "sessions",
  "password_reset_tokens",
  "activity_log",
  "language_lines",
  "users",
];

const ROWS_PER_TABLE = 100;

export async function GET() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name NOT IN (${EXCLUDED.map((t) => `'${t}'`).join(",")})
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);

    const result: Record<string, { rows: Record<string, unknown>[]; total: number }> = {};

    for (const table of tables) {
      const sanitized = table.replace(/[^a-z0-9_]/gi, "");
      if (!sanitized) continue;

      const [countRes, dataRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM "${sanitized}"`),
        pool.query(`SELECT * FROM "${sanitized}" LIMIT $1`, [ROWS_PER_TABLE]),
      ]);
      const total = parseInt(countRes.rows[0]?.total || "0", 10);
      const rows = dataRes.rows.map((r) => {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          obj[k] = v instanceof Date ? v.toISOString() : v;
        }
        return obj;
      });
      result[sanitized] = { rows, total };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tables all error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
