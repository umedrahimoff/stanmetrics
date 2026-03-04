import { NextResponse } from "next/server";
import pool from "@/lib/db";

const EXCLUDED = [
  "migrations", "cache", "cache_locks", "failed_jobs", "jobs", "job_batches",
  "sessions", "password_reset_tokens", "activity_log", "language_lines", "users",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;
  const sanitized = table.replace(/[^a-z0-9_]/gi, "");
  if (!sanitized) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const exists = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [sanitized]
  );
  if (!exists.rows.length || EXCLUDED.includes(sanitized)) {
    return NextResponse.json({ error: "Table not found or not allowed" }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(_req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM "${sanitized}"`
    );
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const result = await pool.query(
      `SELECT * FROM "${sanitized}" LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      rows: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Table data error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
