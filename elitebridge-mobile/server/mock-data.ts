/**
 * Mock Data Service for Elite Bridge
 * Provides realistic sample data for development and testing
 */

import { getDb } from "./_core/db";
import type { InsertUser, InsertCaregiverProfile, InsertShift, InsertApplication, InsertBackgroundCheck, InsertCaregiverRating } from "../drizzle/schema";
import {
  users,
  caregiverProfiles,
  caregiverPreferences,
  shifts,
  applications,
  backgroundChecks,
  locations,
  caregiverRatings,
} from "../drizzle/schema";

export const mockData = {
  // Sample locations in Massachusetts
  locations: [
    {
      name: "Boston Medical Center",
      address: "1 Boston Medical Center Place",
      city: "Boston",
      state: "MA",
      zipCode: "02118",
    },
    {
      name: "Cambridge Senior Living",
      address: "100 Memorial Drive",
      city: "Cambridge",
      state: "MA",
      zipCode: "02142",
    },
    {
      name: "Worcester Care Facility",
      address: "50 Elm Street",
      city: "Worcester",
      state: "MA",
      zipCode: "01608",
    },
    {
      name: "Springfield Community Center",
      address: "75 Main Street",
      city: "Springfield",
      state: "MA",
      zipCode: "01103",
    },
    {
      name: "Lowell Assisted Living",
      address: "200 Merrimack Street",
      city: "Lowell",
      state: "MA",
      zipCode: "01852",
    },
  ],

  // Sample staff members (users with role "user")
  staffMembers: [
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      role: "user" as const,
      openId: "user_sarah_001",
    },
    {
      name: "Michael Chen",
      email: "michael.chen@example.com",
      role: "user" as const,
      openId: "user_michael_001",
    },
    {
      name: "Jessica Martinez",
      email: "jessica.martinez@example.com",
      role: "user" as const,
      openId: "user_jessica_001",
    },
    {
      name: "David Thompson",
      email: "david.thompson@example.com",
      role: "user" as const,
      openId: "user_david_001",
    },
    {
      name: "Emily Rodriguez",
      email: "emily.rodriguez@example.com",
      role: "user" as const,
      openId: "user_emily_001",
    },
    {
      name: "James Wilson",
      email: "james.wilson@example.com",
      role: "user" as const,
      openId: "user_james_001",
    },
  ],

  // Sample admins
  admins: [
    {
      name: "Robert Admin",
      email: "admin@elitebridge.com",
      role: "admin" as const,
      openId: "admin_robert_001",
    },
    {
      name: "Patricia Manager",
      email: "manager@elitebridge.com",
      role: "admin" as const,
      openId: "admin_patricia_001",
    },
  ],

  // Sample shifts
  shifts: [
    {
      title: "Companion Care - Boston",
      description: "Friendly companion needed for elderly client. Light housekeeping and meal prep included.",
      serviceType: "companion" as const,
      location: "Boston, MA",
      startTime: new Date(2026, 4, 24, 9, 0), // May 24, 2026 9:00 AM
      endTime: new Date(2026, 4, 24, 17, 0), // May 24, 2026 5:00 PM
      hourlyRate: 22.5,
      requiredExperience: 1,
      maxCaregivers: 1,
      status: "open" as const,
    },
    {
      title: "Personal Care Assistant - Cambridge",
      description: "Personal care assistance for client with mobility needs. Must be comfortable with physical assistance.",
      serviceType: "personal_care" as const,
      location: "Cambridge, MA",
      startTime: new Date(2026, 4, 25, 8, 0), // May 25, 2026 8:00 AM
      endTime: new Date(2026, 4, 25, 16, 0), // May 25, 2026 4:00 PM
      hourlyRate: 26.0,
      requiredExperience: 2,
      maxCaregivers: 1,
      status: "open" as const,
    },
    {
      title: "Household Management - Worcester",
      description: "Help with household tasks, errands, and organization for busy professional.",
      serviceType: "household" as const,
      location: "Worcester, MA",
      startTime: new Date(2026, 4, 26, 10, 0), // May 26, 2026 10:00 AM
      endTime: new Date(2026, 4, 26, 14, 0), // May 26, 2026 2:00 PM
      hourlyRate: 20.0,
      requiredExperience: 0,
      maxCaregivers: 1,
      status: "open" as const,
    },
    {
      title: "Mobility Assistance - Springfield",
      description: "Assistance with mobility and transportation for senior client. Valid driver's license required.",
      serviceType: "mobility_assistance" as const,
      location: "Springfield, MA",
      startTime: new Date(2026, 4, 27, 11, 0), // May 27, 2026 11:00 AM
      endTime: new Date(2026, 4, 27, 15, 0), // May 27, 2026 3:00 PM
      hourlyRate: 24.0,
      requiredExperience: 1,
      maxCaregivers: 1,
      status: "open" as const,
    },
    {
      title: "Companion Care - Lowell (Weekend)",
      description: "Weekend companion care for active senior. Flexible hours available.",
      serviceType: "companion" as const,
      location: "Lowell, MA",
      startTime: new Date(2026, 4, 31, 10, 0), // May 31, 2026 10:00 AM
      endTime: new Date(2026, 4, 31, 18, 0), // May 31, 2026 6:00 PM
      hourlyRate: 25.0,
      requiredExperience: 0,
      maxCaregivers: 2,
      status: "open" as const,
    },
    {
      title: "Personal Care - Boston (Urgent)",
      description: "Urgent need for personal care assistant. Immediate start possible.",
      serviceType: "personal_care" as const,
      location: "Boston, MA",
      startTime: new Date(2026, 4, 23, 14, 0), // May 23, 2026 2:00 PM
      endTime: new Date(2026, 4, 23, 22, 0), // May 23, 2026 10:00 PM
      hourlyRate: 28.0,
      requiredExperience: 2,
      maxCaregivers: 1,
      status: "open" as const,
    },
  ],

  // Sample caregiver profiles
  caregiverProfiles: [
    {
      licenseNumber: "MA-CG-12345",
      licenseExpiry: new Date(2027, 11, 31),
      backgroundCheckStatus: "approved" as const,
      averageRating: 4.8,
      totalRatings: 24,
      completedShifts: 45,
    },
    {
      licenseNumber: "MA-CG-12346",
      licenseExpiry: new Date(2028, 5, 30),
      backgroundCheckStatus: "approved" as const,
      averageRating: 4.6,
      totalRatings: 18,
      completedShifts: 32,
    },
    {
      licenseNumber: "MA-CG-12347",
      licenseExpiry: new Date(2027, 8, 15),
      backgroundCheckStatus: "pending" as const,
      averageRating: 0,
      totalRatings: 0,
      completedShifts: 0,
    },
    {
      licenseNumber: "MA-CG-12348",
      licenseExpiry: new Date(2028, 2, 28),
      backgroundCheckStatus: "approved" as const,
      averageRating: 4.9,
      totalRatings: 31,
      completedShifts: 58,
    },
    {
      licenseNumber: "MA-CG-12349",
      licenseExpiry: new Date(2027, 11, 30),
      backgroundCheckStatus: "approved" as const,
      averageRating: 4.7,
      totalRatings: 22,
      completedShifts: 40,
    },
    {
      licenseNumber: "MA-CG-12350",
      licenseExpiry: new Date(2028, 4, 15),
      backgroundCheckStatus: "approved" as const,
      averageRating: 4.5,
      totalRatings: 15,
      completedShifts: 28,
    },
  ],

  // Sample applications
  applications: [
    {
      shiftIndex: 0,
      userIndex: 0,
      status: "pending" as const,
      appliedAt: new Date(2026, 4, 22, 10, 30),
    },
    {
      shiftIndex: 0,
      userIndex: 1,
      status: "approved" as const,
      appliedAt: new Date(2026, 4, 22, 9, 15),
      respondedAt: new Date(2026, 4, 22, 14, 0),
    },
    {
      shiftIndex: 1,
      userIndex: 2,
      status: "pending" as const,
      appliedAt: new Date(2026, 4, 22, 11, 45),
    },
    {
      shiftIndex: 2,
      userIndex: 3,
      status: "approved" as const,
      appliedAt: new Date(2026, 4, 21, 16, 20),
      respondedAt: new Date(2026, 4, 22, 9, 0),
    },
    {
      shiftIndex: 3,
      userIndex: 4,
      status: "rejected" as const,
      appliedAt: new Date(2026, 4, 22, 8, 0),
      respondedAt: new Date(2026, 4, 22, 13, 30),
      rejectionReason: "Experience requirements not met",
    },
    {
      shiftIndex: 4,
      userIndex: 5,
      status: "pending" as const,
      appliedAt: new Date(2026, 4, 22, 12, 0),
    },
  ],

  // Sample ratings
  ratings: [
    {
      caregiverIndex: 0,
      clientIndex: 1,
      rating: 5,
      review: "Sarah was absolutely wonderful! Very professional and caring. Highly recommend!",
    },
    {
      caregiverIndex: 0,
      clientIndex: 2,
      rating: 5,
      review: "Excellent care and attention to detail. Will book again.",
    },
    {
      caregiverIndex: 1,
      clientIndex: 0,
      rating: 4,
      review: "Michael was great. Very punctual and reliable.",
    },
    {
      caregiverIndex: 1,
      clientIndex: 3,
      rating: 5,
      review: "Outstanding service. Michael went above and beyond.",
    },
    {
      caregiverIndex: 3,
      clientIndex: 0,
      rating: 5,
      review: "James is the best! Always professional and kind.",
    },
  ],
};

/**
 * Seed the database with mock data
 * Call this function once to populate the database
 */
export async function seedMockData() {
  try {
    console.log("🌱 Seeding mock data...");
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Insert locations
    console.log("📍 Inserting locations...");
    const insertedLocations = await db.insert(locations).values(mockData.locations);

    // Insert staff members
    console.log("👥 Inserting staff members...");
    const staffInserts = mockData.staffMembers.map((staff) => ({
      ...staff,
      loginMethod: "email",
    }));
    const insertedStaff = await db.insert(users).values(staffInserts);

    // Insert admins
    console.log("⚙️ Inserting admins...");
    const adminInserts = mockData.admins.map((admin) => ({
      ...admin,
      loginMethod: "email",
    }));
    const insertedAdmins = await db.insert(users).values(adminInserts);

    // Get the admin ID for shift creation
    const adminId = 7; // Assuming first admin is ID 7 (after 6 staff members)

    // Insert caregiver profiles
    console.log("💼 Inserting caregiver profiles...");
    const profileInserts = mockData.caregiverProfiles.map((profile, index) => ({
      ...profile,
      userId: index + 1, // Link to staff members
    }));
    await db.insert(caregiverProfiles).values(profileInserts);

    // Insert shifts
    console.log("📋 Inserting shifts...");
    const shiftInserts = mockData.shifts.map((shift) => ({
      ...shift,
      createdBy: adminId,
    }));
    const insertedShifts = await db.insert(shifts).values(shiftInserts);

    // Insert applications
    console.log("📝 Inserting applications...");
    const applicationInserts = mockData.applications.map((app) => ({
      shiftId: app.shiftIndex + 1, // Shift IDs start at 1
      userId: app.userIndex + 1, // User IDs start at 1
      status: app.status,
      appliedAt: app.appliedAt,
      respondedAt: app.respondedAt,
      rejectionReason: app.rejectionReason,
    }));
    await db.insert(applications).values(applicationInserts);

    // Insert background checks
    console.log("🔍 Inserting background checks...");
    const bgCheckInserts = mockData.caregiverProfiles.map((profile, index) => ({
      userId: index + 1,
      status: profile.backgroundCheckStatus,
      requestedAt: new Date(2026, 3, 1),
      completedAt: profile.backgroundCheckStatus === "approved" ? new Date(2026, 3, 15) : null,
    }));
    await db.insert(backgroundChecks).values(bgCheckInserts);

    // Insert ratings
    console.log("⭐ Inserting ratings...");
    const ratingInserts = mockData.ratings.map((rating) => ({
      caregiverId: rating.caregiverIndex + 1,
      clientId: rating.clientIndex + 1,
      rating: rating.rating,
      review: rating.review,
      createdAt: new Date(),
    }));
    await db.insert(caregiverRatings).values(ratingInserts);

    console.log("✅ Mock data seeded successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error seeding mock data:", error);
    throw error;
  }
}
