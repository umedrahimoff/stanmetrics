import { Pool } from "pg";

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    }
  : {
      host: process.env.DB_HOST || "46.62.224.75",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "stanbase_prod_double",
      user: process.env.DB_USER || "thisisumed",
      password: process.env.DB_PASSWORD || "U84Wht0kTE8fKcG9s6O5",
      connectionTimeoutMillis: 15000,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    };

const pool = new Pool(connectionConfig);

export default pool;
