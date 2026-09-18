import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import * as schema from "./schema.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: "-c timezone=UTC",
  // Existing timestamp-without-zone columns represent UTC instants.
  // Do not let a host's local timezone shift them during decoding.
  types: {
    getTypeParser(oid, format) {
      if (oid === 1114 && format !== "binary") return (value: string) => new Date(`${value.replace(" ", "T")}Z`);
      return pg.types.getTypeParser(oid, format);
    },
  },
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

// Health check
export async function checkDatabaseConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}
