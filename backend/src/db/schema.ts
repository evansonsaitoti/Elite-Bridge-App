import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  json,
  enum as pgEnum,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["caregiver", "employer", "admin"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
  "suspended",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

// Users Table
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    role: userRoleEnum("role").notNull().default("caregiver"),
    phone: varchar("phone", { length: 20 }),
    profileImage: text("profile_image"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    emailVerified: boolean("email_verified").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("email_idx").on(table.email),
    roleIdx: index("role_idx").on(table.role),
  })
);

// Caregivers Table
export const caregivers = pgTable(
  "caregivers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
    specialties: json("specialties").$type<string[]>().default(sql`'[]'`),
    certifications: json("certifications").$type<string[]>().default(sql`'[]'`),
    yearsExperience: integer("years_experience"),
    backgroundCheckStatus: verificationStatusEnum("background_check_status")
      .default("pending"),
    backgroundCheckDate: timestamp("background_check_date"),
    backgroundCheckProvider: varchar("background_check_provider", { length: 100 }),
    backgroundCheckId: varchar("background_check_id", { length: 255 }),
    availability: json("availability").$type<Record<string, string[]>>(),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
    totalReviews: integer("total_reviews").default(0),
    totalEarnings: decimal("total_earnings", { precision: 15, scale: 2 }).default("0"),
    totalHours: decimal("total_hours", { precision: 10, scale: 2 }).default("0"),
    isAvailable: boolean("is_available").default(true),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("caregiver_user_id_idx").on(table.userId),
    ratingIdx: index("caregiver_rating_idx").on(table.rating),
  })
);

// Employers Table
export const employers = pgTable(
  "employers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    companyLogo: text("company_logo"),
    companyDescription: text("company_description"),
    website: varchar("website", { length: 255 }),
    industry: varchar("industry", { length: 100 }),
    serviceArea: json("service_area").$type<string[]>(),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    taxId: varchar("tax_id", { length: 50 }),
    billingAddress: json("billing_address").$type<Record<string, string>>(),
    teamSize: integer("team_size"),
    totalSpent: decimal("total_spent", { precision: 15, scale: 2 }).default("0"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("employer_user_id_idx").on(table.userId),
  })
);

// Bookings Table
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    caregiverId: integer("caregiver_id")
      .notNull()
      .references(() => caregivers.id, { onDelete: "cascade" }),
    employerId: integer("employer_id")
      .notNull()
      .references(() => employers.id, { onDelete: "cascade" }),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    serviceType: varchar("service_type", { length: 100 }).notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: varchar("cancelled_by", { length: 50 }),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    caregiverIdIdx: index("booking_caregiver_id_idx").on(table.caregiverId),
    employerIdIdx: index("booking_employer_id_idx").on(table.employerId),
    statusIdx: index("booking_status_idx").on(table.status),
    startTimeIdx: index("booking_start_time_idx").on(table.startTime),
  })
);

// Messages Table
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    attachments: json("attachments").$type<string[]>(),
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    senderIdIdx: index("message_sender_id_idx").on(table.senderId),
    recipientIdIdx: index("message_recipient_id_idx").on(table.recipientId),
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  })
);

// Reviews Table
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    caregiverId: integer("caregiver_id")
      .notNull()
      .references(() => caregivers.id, { onDelete: "cascade" }),
    employerId: integer("employer_id")
      .notNull()
      .references(() => employers.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1-5
    title: varchar("title", { length: 255 }),
    comment: text("comment"),
    isAnonymous: boolean("is_anonymous").default(false),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    caregiverIdIdx: index("review_caregiver_id_idx").on(table.caregiverId),
    bookingIdIdx: index("review_booking_id_idx").on(table.bookingId),
  })
);

// Payments Table
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    employerId: integer("employer_id")
      .notNull()
      .references(() => employers.id, { onDelete: "cascade" }),
    caregiverId: integer("caregiver_id")
      .notNull()
      .references(() => caregivers.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    platformFee: decimal("platform_fee", { precision: 15, scale: 2 }).notNull(),
    caregiverPayout: decimal("caregiver_payout", { precision: 15, scale: 2 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    stripePaymentId: varchar("stripe_payment_id", { length: 255 }),
    stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
    paymentMethod: varchar("payment_method", { length: 50 }),
    invoiceNumber: varchar("invoice_number", { length: 50 }).unique(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    bookingIdIdx: index("payment_booking_id_idx").on(table.bookingId),
    statusIdx: index("payment_status_idx").on(table.status),
    stripePaymentIdIdx: index("payment_stripe_id_idx").on(table.stripePaymentId),
  })
);

// Notifications Table
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // booking, message, payment, review, etc.
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    relatedId: integer("related_id"), // booking_id, message_id, etc.
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    userIdIdx: index("notification_user_id_idx").on(table.userId),
    typeIdx: index("notification_type_idx").on(table.type),
    isReadIdx: index("notification_is_read_idx").on(table.isRead),
  })
);

// Admin Verifications Table
export const adminVerifications = pgTable(
  "admin_verifications",
  {
    id: serial("id").primaryKey(),
    caregiverId: integer("caregiver_id")
      .notNull()
      .references(() => caregivers.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 100 }).notNull(), // certification, id, background_check
    documentUrl: text("document_url").notNull(),
    status: verificationStatusEnum("status").notNull().default("pending"),
    verifiedBy: integer("verified_by").references(() => users.id),
    verificationNotes: text("verification_notes"),
    expiryDate: timestamp("expiry_date"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    caregiverIdIdx: index("verification_caregiver_id_idx").on(table.caregiverId),
    statusIdx: index("verification_status_idx").on(table.status),
  })
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  caregiver: one(caregivers, {
    fields: [users.id],
    references: [caregivers.userId],
  }),
  employer: one(employers, {
    fields: [users.id],
    references: [employers.userId],
  }),
  sentMessages: many(messages, {
    relationName: "sender",
  }),
  receivedMessages: many(messages, {
    relationName: "recipient",
  }),
  notifications: many(notifications),
}));

export const caregiversRelations = relations(caregivers, ({ one, many }) => ({
  user: one(users, {
    fields: [caregivers.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
  verifications: many(adminVerifications),
}));

export const employersRelations = relations(employers, ({ one, many }) => ({
  user: one(users, {
    fields: [employers.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  caregiver: one(caregivers, {
    fields: [bookings.caregiverId],
    references: [caregivers.id],
  }),
  employer: one(employers, {
    fields: [bookings.employerId],
    references: [employers.id],
  }),
  payment: one(payments),
  review: one(reviews),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  employer: one(employers, {
    fields: [payments.employerId],
    references: [employers.id],
  }),
  caregiver: one(caregivers, {
    fields: [payments.caregiverId],
    references: [caregivers.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  caregiver: one(caregivers, {
    fields: [reviews.caregiverId],
    references: [caregivers.id],
  }),
  employer: one(employers, {
    fields: [reviews.employerId],
    references: [employers.id],
  }),
}));
