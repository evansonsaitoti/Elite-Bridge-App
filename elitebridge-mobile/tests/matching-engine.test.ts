import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateMatchScore,
  findBestMatches,
  filterQualifiedCaregivers,
} from "../server/matching-engine";
import * as db from "../server/db";
import type { Shift, CaregiverPreferences, CaregiverProfile } from "../drizzle/schema";

// Mock the database functions
vi.mock("../server/db", () => ({
  getCaregiverPreferences: vi.fn(),
  getCaregiverProfile: vi.fn(),
  getShiftById: vi.fn(),
}));

describe("Matching Engine", () => {
  const mockShift: Shift = {
    id: 1,
    title: "Companion Care",
    description: "Elderly companion care",
    serviceType: "companion",
    location: "123 Main St, Boston, MA",
    latitude: 42.3601 as any,
    longitude: -71.0589 as any,
    startTime: new Date("2026-05-20T09:00:00") as any,
    endTime: new Date("2026-05-20T17:00:00") as any,
    hourlyRate: 25 as any,
    requiredExperience: 2,
    maxCaregivers: 1,
    status: "open",
    createdBy: 1,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
  };

  const mockPreferences: CaregiverPreferences = {
    id: 1,
    caregiverId: 1,
    mondayAvailable: true,
    mondayStartTime: "08:00",
    mondayEndTime: "18:00",
    tuesdayAvailable: true,
    tuesdayStartTime: "08:00",
    tuesdayEndTime: "18:00",
    wednesdayAvailable: true,
    wednesdayStartTime: "08:00",
    wednesdayEndTime: "18:00",
    thursdayAvailable: true,
    thursdayStartTime: "08:00",
    thursdayEndTime: "18:00",
    fridayAvailable: true,
    fridayStartTime: "08:00",
    fridayEndTime: "18:00",
    saturdayAvailable: false,
    saturdayStartTime: null,
    saturdayEndTime: null,
    sundayAvailable: false,
    sundayStartTime: null,
    sundayEndTime: null,
    elderCareWilling: true,
    childCareWilling: false,
    disabilityCareWilling: false,
    minHourlyRate: 20 as any,
    maxHoursPerWeek: 40,
    travelPreference: "within 5 miles",
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
  };

  const mockProfile: CaregiverProfile = {
    id: 1,
    userId: 1,
    licenseNumber: "LIC123",
    licenseExpiry: new Date() as any,
    taxId: "TAX123",
    bankAccountId: "BANK123",
    backgroundCheckStatus: "approved",
    backgroundCheckId: "CHECK123",
    averageRating: 4.5 as any,
    totalRatings: 10,
    completedShifts: 5,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateMatchScore", () => {
    it("should calculate a match score for a qualified caregiver", async () => {
      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(mockPreferences);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(mockProfile);

      const score = await calculateMatchScore(mockShift, 1);

      expect(score).toBeDefined();
      expect(score?.totalScore).toBeGreaterThan(0);
      expect(score?.availabilityScore).toBeGreaterThan(0);
      expect(score?.serviceTypeScore).toBe(25); // Full score for willing service type
      expect(score?.ratingScore).toBeGreaterThan(0); // Good rating
    });

    it("should return null if preferences not found", async () => {
      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(null);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(mockProfile);

      const score = await calculateMatchScore(mockShift, 1);

      expect(score).toBeNull();
    });

    it("should return null if profile not found", async () => {
      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(mockPreferences);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(null);

      const score = await calculateMatchScore(mockShift, 1);

      expect(score).toBeNull();
    });

    it("should give zero service type score if not willing", async () => {
      const unwillingPrefs = {
        ...mockPreferences,
        elderCareWilling: false,
      };

      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(unwillingPrefs);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(mockProfile);

      const score = await calculateMatchScore(mockShift, 1);

      expect(score?.serviceTypeScore).toBe(0);
    });

    it("should give zero rate score if below minimum", async () => {
      const highMinRatePrefs = {
        ...mockPreferences,
        minHourlyRate: 50 as any,
      };

      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(highMinRatePrefs);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(mockProfile);

      const score = await calculateMatchScore(mockShift, 1);

      expect(score?.rateScore).toBe(0);
    });

    it("should give full rate score if meets minimum", async () => {
      const perfectRatePrefs = {
        ...mockPreferences,
        minHourlyRate: 20 as any,
      };

      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(perfectRatePrefs);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(mockProfile);

      const score = await calculateMatchScore(mockShift, 1);

      expect(score?.rateScore).toBe(15);
    });
  });

  describe("findBestMatches", () => {
    it("should return top N matches sorted by score", async () => {
      vi.mocked(db.getCaregiverPreferences)
        .mockResolvedValueOnce(mockPreferences)
        .mockResolvedValueOnce({ ...mockPreferences, elderCareWilling: false })
        .mockResolvedValueOnce(mockPreferences);

      vi.mocked(db.getCaregiverProfile)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce({ ...mockProfile, averageRating: 5 as any });

      const matches = await findBestMatches(mockShift, [1, 2, 3], 2);

      expect(matches.length).toBeLessThanOrEqual(2);
      expect(matches[0].score.totalScore).toBeGreaterThanOrEqual(
        matches[1]?.score.totalScore || 0
      );
    });

    it("should return empty array if no matches", async () => {
      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(null);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(null);

      const matches = await findBestMatches(mockShift, [1, 2, 3], 10);

      expect(matches.length).toBe(0);
    });
  });

  describe("filterQualifiedCaregivers", () => {
    it("should filter caregivers above minimum score threshold", async () => {
      vi.mocked(db.getCaregiverPreferences)
        .mockResolvedValueOnce(mockPreferences)
        .mockResolvedValueOnce({ ...mockPreferences, elderCareWilling: false });

      vi.mocked(db.getCaregiverProfile)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(mockProfile);

      const qualified = await filterQualifiedCaregivers(
        mockShift,
        [1, 2],
        50
      );

      expect(qualified.length).toBeGreaterThanOrEqual(0);
      qualified.forEach((match) => {
        expect(match.score.totalScore).toBeGreaterThanOrEqual(50);
      });
    });

    it("should return empty array if no caregivers meet threshold", async () => {
      vi.mocked(db.getCaregiverPreferences).mockResolvedValue(null);
      vi.mocked(db.getCaregiverProfile).mockResolvedValue(null);

      const qualified = await filterQualifiedCaregivers(
        mockShift,
        [1, 2, 3],
        90
      );

      expect(qualified.length).toBe(0);
    });
  });
});
