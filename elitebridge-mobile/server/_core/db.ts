import { ENV } from "./env";

let dbInstance: any = null;

export async function getDb() {
  if (!ENV.databaseUrl) {
    console.warn("DATABASE_URL not configured");
    return null;
  }

  if (!dbInstance) {
    try {
      const { drizzle } = await import("drizzle-orm/mysql2");
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool(ENV.databaseUrl);
      dbInstance = drizzle(pool, {
        schema: require("../../drizzle/schema"),
      });
    } catch (error) {
      console.error("Failed to initialize database:", error);
      return null;
    }
  }

  return dbInstance;
}
