import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { getDb } from "./_core/db";
import {
  users,
  caregiverProfiles,
  caregiverPreferences,
  shifts,
  shiftOffers,
  shiftMatchingHistory,
  caregiverRatings,
  notifications,
  User,
  InsertUser,
  InsertShift,
  InsertCaregiverPreferences,
  InsertShiftOffer,
  InsertShiftMatchingHistory,
  InsertCaregiverRating,
  InsertNotification,
  InsertCaregiverProfile,
} from "../drizzle/schema";

// ============================================================================
// User Management Operations
// ============================================================================

export async function getUserByOpenId(openId: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .then((results: any) => results[0] || null);
}

export async function upsertUser(data: InsertUser): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to find existing user
  const existing = await getUserByOpenId(data.openId);
  if (existing) {
    // Update existing user
    await db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        loginMethod: data.loginMethod,
        lastSignedIn: data.lastSignedIn,
      })
      .where(eq(users.openId, data.openId));
    return getUserByOpenId(data.openId) as Promise<User>;
  } else {
    // Create new user
    await db.insert(users).values(data);
    return getUserByOpenId(data.openId) as Promise<User>;
  }
}

// ============================================================================
// Caregiver Profile Operations
// ============================================================================

export async function getCaregiverProfile(caregiverId: number) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.userId, caregiverId))
    .then((results: any) => results[0] || null);
}

export async function createCaregiverProfile(data: InsertCaregiverProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(caregiverProfiles).values(data);
  return result.insertId;
}

export async function updateCaregiverProfile(
  caregiverId: number,
  data: Partial<InsertCaregiverProfile>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(caregiverProfiles)
    .set(data)
    .where(eq(caregiverProfiles.userId, caregiverId));
}

// ============================================================================
// Caregiver Preferences Operations
// ============================================================================

export async function getCaregiverPreferences(caregiverId: number) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(caregiverPreferences)
    .where(eq(caregiverPreferences.caregiverId, caregiverId))
    .then((results: any) => results[0] || null);
}

export async function createCaregiverPreferences(
  data: InsertCaregiverPreferences
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(caregiverPreferences).values(data);
  return result.insertId;
}

export async function updateCaregiverPreferences(
  caregiverId: number,
  data: Partial<InsertCaregiverPreferences>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(caregiverPreferences)
    .set(data)
    .where(eq(caregiverPreferences.caregiverId, caregiverId));
}

// ============================================================================
// Shift Operations
// ============================================================================

export async function getShiftById(shiftId: number) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(shifts)
    .where(eq(shifts.id, shiftId))
    .then((results: any) => results[0] || null);
}

export async function listOpenShifts(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shifts)
    .where(eq(shifts.status, "open"))
    .orderBy(desc(shifts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createShift(data: InsertShift) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(shifts).values(data);
  return result.insertId;
}

export async function updateShift(
  shiftId: number,
  data: Partial<InsertShift>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(shifts).set(data).where(eq(shifts.id, shiftId));
}

export async function deleteShift(shiftId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(shifts).where(eq(shifts.id, shiftId));
}

// ============================================================================
// Shift Offers Operations
// ============================================================================

export async function getShiftOffer(offerId: number) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(shiftOffers)
    .where(eq(shiftOffers.id, offerId))
    .then((results: any) => results[0] || null);
}

export async function listPendingOffers(caregiverId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shiftOffers)
    .where(
      and(
        eq(shiftOffers.caregiverId, caregiverId),
        eq(shiftOffers.status, "pending")
      )
    )
    .orderBy(desc(shiftOffers.createdAt));
}

export async function createShiftOffer(data: InsertShiftOffer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(shiftOffers).values(data);
  return result.insertId;
}

export async function updateShiftOfferStatus(
  offerId: number,
  status: "accepted" | "declined" | "expired"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(shiftOffers)
    .set({
      status,
      respondedAt: new Date(),
    })
    .where(eq(shiftOffers.id, offerId));
}

// ============================================================================
// Shift Matching Operations
// ============================================================================

export async function recordMatchingHistory(
  data: InsertShiftMatchingHistory
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(shiftMatchingHistory).values(data);
  return result.insertId;
}

export async function getMatchingHistory(shiftId: number, caregiverId: number) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(shiftMatchingHistory)
    .where(
      and(
        eq(shiftMatchingHistory.shiftId, shiftId),
        eq(shiftMatchingHistory.caregiverId, caregiverId)
      )
    )
    .then((results: any) => results[0] || null);
}

export async function listTopMatches(shiftId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shiftMatchingHistory)
    .where(eq(shiftMatchingHistory.shiftId, shiftId))
    .orderBy(desc(shiftMatchingHistory.matchScore))
    .limit(limit);
}

// ============================================================================
// Caregiver Ratings Operations
// ============================================================================

export async function submitRating(data: InsertCaregiverRating) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(caregiverRatings).values(data);
  return result.insertId;
}

export async function getCaregiverRatings(caregiverId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(caregiverRatings)
    .where(eq(caregiverRatings.caregiverId, caregiverId))
    .orderBy(desc(caregiverRatings.createdAt));
}

export async function getAverageRating(caregiverId: number) {
  const db = await getDb();
  if (!db) return 0;

  const profile = await getCaregiverProfile(caregiverId);
  return profile?.averageRating ? parseFloat(profile.averageRating.toString()) : 0;
}

// ============================================================================
// Notifications Operations
// ============================================================================

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(data);
  return result.insertId;
}

export async function listNotifications(
  userId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );

  return result.length;
}
