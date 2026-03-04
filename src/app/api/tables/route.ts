import { NextResponse } from "next/server";
import pool from "@/lib/db";

const EXCLUDED_TABLES = [
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

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN (${EXCLUDED_TABLES.map((t) => `'${t}'`).join(",")})
      ORDER BY table_name
    `);
    const tables = result.rows.map((r) => r.table_name);
    return NextResponse.json(tables);
  } catch (error) {
    console.error("Tables list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
