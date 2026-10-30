import { SQL, sql } from "drizzle-orm";

// Correlates either a user column or a bound ID to a shared active organization.
// Message handlers still constrain every conversation to the authenticated user.
export function sharedOrganization(userId: number, peerId: number | SQL) {
  return sql`EXISTS (
    SELECT 1 FROM (
      SELECT employer_id FROM employer_memberships WHERE user_id=${userId}
      UNION
      SELECT employer_id FROM employer_caregivers
        WHERE caregiver_user_id=${userId} AND status='active'
    ) mine
    JOIN (
      SELECT employer_id FROM employer_memberships WHERE user_id=${peerId}
      UNION
      SELECT employer_id FROM employer_caregivers
        WHERE caregiver_user_id=${peerId} AND status='active'
    ) peer ON peer.employer_id=mine.employer_id
  )`;
}
