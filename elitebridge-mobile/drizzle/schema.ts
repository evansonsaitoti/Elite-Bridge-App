import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Caregiver profiles - extends users table with caregiver-specific information
 */
export const caregiverProfiles = mysqlTable("caregiverProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  licenseNumber: varchar("licenseNumber", { length: 50 }),
  licenseExpiry: timestamp("licenseExpiry"),
  taxId: varchar("taxId", { length: 50 }),
  bankAccountId: varchar("bankAccountId", { length: 100 }),
  backgroundCheckStatus: mysqlEnum("backgroundCheckStatus", ["pending", "approved", "rejected"]).default("pending"),
  backgroundCheckId: varchar("backgroundCheckId", { length: 100 }),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0"),
  totalRatings: int("totalRatings").default(0),
  completedShifts: int("completedShifts").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaregiverProfile = typeof caregiverProfiles.$inferSelect;
export type InsertCaregiverProfile = typeof caregiverProfiles.$inferInsert;

/**
 * Shifts - job postings created by admins
 */
export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  serviceType: mysqlEnum("serviceType", ["companion", "personal_care", "household", "mobility_assistance"]).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  hourlyRate: decimal("hourlyRate", { precision: 8, scale: 2 }).notNull(),
  requiredExperience: int("requiredExperience").default(0), // in years
  maxCaregivers: int("maxCaregivers").default(1),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).default("open"),
  createdBy: int("createdBy").notNull(), // admin user id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

/**
 * Caregiver preferences and availability
 */
export const caregiverPreferences = mysqlTable("caregiverPreferences", {
  id: int("id").autoincrement().primaryKey(),
  caregiverId: int("caregiverId").notNull().unique(),
  // Availability (30 columns for each day/time)
  mondayAvailable: boolean("mondayAvailable").default(false),
  mondayStartTime: varchar("mondayStartTime", { length: 5 }), // HH:MM format
  mondayEndTime: varchar("mondayEndTime", { length: 5 }),
  tuesdayAvailable: boolean("tuesdayAvailable").default(false),
  tuesdayStartTime: varchar("tuesdayStartTime", { length: 5 }),
  tuesdayEndTime: varchar("tuesdayEndTime", { length: 5 }),
  wednesdayAvailable: boolean("wednesdayAvailable").default(false),
  wednesdayStartTime: varchar("wednesdayStartTime", { length: 5 }),
  wednesdayEndTime: varchar("wednesdayEndTime", { length: 5 }),
  thursdayAvailable: boolean("thursdayAvailable").default(false),
  thursdayStartTime: varchar("thursdayStartTime", { length: 5 }),
  thursdayEndTime: varchar("thursdayEndTime", { length: 5 }),
  fridayAvailable: boolean("fridayAvailable").default(false),
  fridayStartTime: varchar("fridayStartTime", { length: 5 }),
  fridayEndTime: varchar("fridayEndTime", { length: 5 }),
  saturdayAvailable: boolean("saturdayAvailable").default(false),
  saturdayStartTime: varchar("saturdayStartTime", { length: 5 }),
  saturdayEndTime: varchar("saturdayEndTime", { length: 5 }),
  sundayAvailable: boolean("sundayAvailable").default(false),
  sundayStartTime: varchar("sundayStartTime", { length: 5 }),
  sundayEndTime: varchar("sundayEndTime", { length: 5 }),
  // Service preferences
  elderCareWilling: boolean("elderCareWilling").default(false),
  childCareWilling: boolean("childCareWilling").default(false),
  disabilityCareWilling: boolean("disabilityCareWilling").default(false),
  // Rate preferences
  minHourlyRate: decimal("minHourlyRate", { precision: 8, scale: 2 }),
  maxHoursPerWeek: int("maxHoursPerWeek"),
  travelPreference: varchar("travelPreference", { length: 100 }), // e.g., "within 5 miles"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaregiverPreferences = typeof caregiverPreferences.$inferSelect;
export type InsertCaregiverPreferences = typeof caregiverPreferences.$inferInsert;

/**
 * Shift matching history - tracks matching events
 */
export const shiftMatchingHistory = mysqlTable("shiftMatchingHistory", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  caregiverId: int("caregiverId").notNull(),
  matchScore: decimal("matchScore", { precision: 5, scale: 2 }).notNull(),
  // Scoring breakdown
  availabilityScore: decimal("availabilityScore", { precision: 5, scale: 2 }).default("0"),
  serviceTypeScore: decimal("serviceTypeScore", { precision: 5, scale: 2 }).default("0"),
  locationScore: decimal("locationScore", { precision: 5, scale: 2 }).default("0"),
  rateScore: decimal("rateScore", { precision: 5, scale: 2 }).default("0"),
  ratingScore: decimal("ratingScore", { precision: 5, scale: 2 }).default("0"),
  totalScore: decimal("totalScore", { precision: 5, scale: 2 }).default("0"),
  matchedAt: timestamp("matchedAt").defaultNow().notNull(),
  offerSent: boolean("offerSent").default(false),
  offerAccepted: boolean("offerAccepted").default(false),
  acceptedAt: timestamp("acceptedAt"),
});

export type ShiftMatchingHistory = typeof shiftMatchingHistory.$inferSelect;
export type InsertShiftMatchingHistory = typeof shiftMatchingHistory.$inferInsert;

/**
 * Shift offers - formal offers sent to caregivers
 */
export const shiftOffers = mysqlTable("shiftOffers", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  caregiverId: int("caregiverId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "expired"]).default("pending"),
  offerMessage: text("offerMessage"),
  expiresAt: timestamp("expiresAt").notNull(),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftOffer = typeof shiftOffers.$inferSelect;
export type InsertShiftOffer = typeof shiftOffers.$inferInsert;

/**
 * Caregiver ratings and reviews
 */
export const caregiverRatings = mysqlTable("caregiverRatings", {
  id: int("id").autoincrement().primaryKey(),
  caregiverId: int("caregiverId").notNull(),
  clientId: int("clientId").notNull(),
  shiftId: int("shiftId"),
  rating: int("rating").notNull(), // 1-5
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaregiverRating = typeof caregiverRatings.$inferSelect;
export type InsertCaregiverRating = typeof caregiverRatings.$inferInsert;

/**
 * Locations table for Elite Bridge staffing
 */
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zipCode", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Applications table - staff applying for shifts
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "accepted"]).default("pending"),
  rejectionReason: text("rejectionReason"),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Background Checks table - Checkr integration
 */
export const backgroundChecks = mysqlTable("backgroundChecks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  checkrId: varchar("checkrId", { length: 255 }),
  status: mysqlEnum("status", ["pending", "completed", "clear", "consider"]).default("pending"),
  result: json("result"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackgroundCheck = typeof backgroundChecks.$inferSelect;
export type InsertBackgroundCheck = typeof backgroundChecks.$inferInsert;

/**
 * Conversations table for messaging
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  participantIds: json("participantIds").notNull(), // Array of user IDs
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table for conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Payments table for shift compensation
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  applicationId: int("applicationId"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending"),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Invoices table
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }).notNull().unique(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending"),
  items: json("items").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  dueAt: timestamp("dueAt"),
  paidAt: timestamp("paidAt"),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Ratings table for staff and employers
 */
export const ratings = mysqlTable("ratings", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(),
  toUserId: int("toUserId").notNull(),
  applicationId: int("applicationId"),
  score: int("score").notNull(), // 1-5 stars
  review: text("review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Rating = typeof ratings.$inferSelect;
export type InsertRating = typeof ratings.$inferInsert;

/**
 * Notifications for Elite Bridge platform
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["shift_posted", "application_status", "message", "payment", "background_check"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  data: json("data"),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;


/**
 * Clock In/Out Records - Track caregiver work hours
 */
export const clockRecords = mysqlTable("clockRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  shiftId: int("shiftId").notNull(),
  clockInTime: timestamp("clockInTime").notNull(),
  clockOutTime: timestamp("clockOutTime"),
  hoursWorked: decimal("hoursWorked", { precision: 5, scale: 2 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["in_progress", "completed", "approved"]).default("in_progress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClockRecord = typeof clockRecords.$inferSelect;
export type InsertClockRecord = typeof clockRecords.$inferInsert;

/**
 * Shift Allocations - Admin assigns shifts to caregivers (Deputy-style)
 */
export const shiftAllocations = mysqlTable("shiftAllocations", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  caregiverId: int("caregiverId").notNull(),
  allocatedBy: int("allocatedBy").notNull(), // admin user id
  status: mysqlEnum("status", ["allocated", "accepted", "declined", "completed", "cancelled"]).default("allocated"),
  allocationMessage: text("allocationMessage"),
  respondedAt: timestamp("respondedAt"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  allocatedAt: timestamp("allocatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftAllocation = typeof shiftAllocations.$inferSelect;
export type InsertShiftAllocation = typeof shiftAllocations.$inferInsert;
