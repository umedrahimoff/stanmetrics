import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "46.62.224.75",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "stanbase_prod_double",
  user: process.env.DB_USER || "thisisumed",
  password: process.env.DB_PASSWORD || "U84Wht0kTE8fKcG9s6O5",
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL || (process.env.DB_HOST || "").includes("neon")
    ? { rejectUnauthorized: false }
    : undefined,
});

export default pool;
