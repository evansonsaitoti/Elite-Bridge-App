import { sql } from 'drizzle-orm';
import { db } from '../db';
export async function ensureTimeCorrections() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS time_correction_requests (
    id SERIAL PRIMARY KEY,shift_id INTEGER NOT NULL REFERENCES shift_posts(id),caregiver_id INTEGER NOT NULL REFERENCES caregivers(id),
    employer_id INTEGER NOT NULL REFERENCES employers(id),requested_by INTEGER NOT NULL REFERENCES users(id),
    clock_in_at TIMESTAMP NOT NULL,clock_out_at TIMESTAMP NOT NULL,reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',original JSONB NOT NULL,reviewed_by INTEGER REFERENCES users(id),review_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,reviewed_at TIMESTAMP,
    CHECK(clock_out_at>clock_in_at))`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS one_pending_time_correction ON time_correction_requests(shift_id,caregiver_id) WHERE status='pending'`);
}
