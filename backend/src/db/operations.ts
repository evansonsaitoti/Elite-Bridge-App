import { sql } from "drizzle-orm";
import { db } from "./index";

let ready: Promise<void> | undefined;
export function ensureOperations() {
  return (ready ||= initialize().catch((error) => {
    ready = undefined;
    throw error;
  }));
}
async function initialize() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS shift_geofences (
    shift_id INTEGER PRIMARY KEY REFERENCES shift_posts(id) ON DELETE CASCADE, employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, radius_meters INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS operation_audit (
    id SERIAL PRIMARY KEY, employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, record_id INTEGER, detail JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS incident_reports (
    id SERIAL PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shift_posts(id) ON DELETE CASCADE, employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL, category TEXT NOT NULL, severity TEXT NOT NULL,
    description TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'open',
    resolution TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS incident_updates (
    id SERIAL PRIMARY KEY, incident_id INTEGER NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE, author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL, note TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS incident_employer_idx ON incident_reports(employer_id, created_at DESC)`,
  );
}
