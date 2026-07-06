import { Pool } from "pg";
import { env } from "./config/env.js";

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: env.databaseUrl
});

export const closeDatabase = async () => {
  await pool.end();
};
