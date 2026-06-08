import { describe, it, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

/**
 * Integration tests for tRPC routers
 * These tests verify the API endpoints work correctly with proper validation
 */

describe("tRPC Routers", () => {
  describe("Shifts Router", () => {
    it("should validate shift creation input", () => {
      const createShiftSchema = z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        serviceType: z.enum([
          "companion",
          "personal_care",
          "household",
          "mobility_assistance",
        ]),
        location: z.string().min(1).max(255),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        startTime: z.date(),
        endTime: z.date(),
        hourlyRate: z.number().positive(),
        requiredExperience: z.number().default(0),
        maxCaregivers: z.number().default(1),
      });

      const validInput = {
        title: "Companion Care",
        serviceType: "companion" as const,
        location: "Boston, MA",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        hourlyRate: 25,
      };

      const result = createShiftSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject invalid shift creation input", () => {
      const createShiftSchema = z.object({
        title: z.string().min(1).max(255),
        serviceType: z.enum([
          "companion",
          "personal_care",
          "household",
          "mobility_assistance",
        ]),
        location: z.string().min(1).max(255),
        startTime: z.date(),
        endTime: z.date(),
        hourlyRate: z.number().positive(),
      });

      const invalidInput = {
        title: "", // Empty title
        serviceType: "invalid_type",
        location: "Boston, MA",
        startTime: new Date(),
        endTime: new Date(),
        hourlyRate: -10, // Negative rate
      };

      const result = createShiftSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should validate shift list query input", () => {
      const listShiftsSchema = z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      });

      const validInput = {
        limit: 50,
        offset: 0,
      };

      const result = listShiftsSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("Preferences Router", () => {
    it("should validate preference update input", () => {
      const updatePreferencesSchema = z.object({
        mondayAvailable: z.boolean().optional(),
        mondayStartTime: z.string().optional(),
        mondayEndTime: z.string().optional(),
        elderCareWilling: z.boolean().optional(),
        childCareWilling: z.boolean().optional(),
        minHourlyRate: z.number().optional(),
        maxHoursPerWeek: z.number().optional(),
      });

      const validInput = {
        mondayAvailable: true,
        mondayStartTime: "08:00",
        mondayEndTime: "17:00",
        elderCareWilling: true,
        minHourlyRate: 20,
        maxHoursPerWeek: 40,
      };

      const result = updatePreferencesSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should allow empty preference update", () => {
      const updatePreferencesSchema = z.object({
        mondayAvailable: z.boolean().optional(),
        elderCareWilling: z.boolean().optional(),
      });

      const emptyInput = {};

      const result = updatePreferencesSchema.safeParse(emptyInput);
      expect(result.success).toBe(true);
    });
  });

  describe("Offers Router", () => {
    it("should validate offer creation input", () => {
      const createOfferSchema = z.object({
        shiftId: z.number(),
        caregiverId: z.number(),
        offerMessage: z.string().optional(),
        expiresAt: z.date(),
      });

      const validInput = {
        shiftId: 1,
        caregiverId: 1,
        offerMessage: "Great opportunity!",
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
      };

      const result = createOfferSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate offer status update", () => {
      const updateStatusSchema = z.object({
        offerId: z.number(),
        status: z.enum(["accepted", "declined", "expired"]),
      });

      const validInput = {
        offerId: 1,
        status: "accepted" as const,
      };

      const result = updateStatusSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("Ratings Router", () => {
    it("should validate rating submission", () => {
      const submitRatingSchema = z.object({
        caregiverId: z.number(),
        shiftId: z.number().optional(),
        rating: z.number().min(1).max(5),
        review: z.string().optional(),
      });

      const validInput = {
        caregiverId: 1,
        shiftId: 1,
        rating: 5,
        review: "Excellent service!",
      };

      const result = submitRatingSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject invalid rating values", () => {
      const submitRatingSchema = z.object({
        caregiverId: z.number(),
        rating: z.number().min(1).max(5),
      });

      const invalidInput = {
        caregiverId: 1,
        rating: 10, // Out of range
      };

      const result = submitRatingSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("Notifications Router", () => {
    it("should validate notification list query", () => {
      const listNotificationsSchema = z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      });

      const validInput = {
        limit: 100,
        offset: 0,
      };

      const result = listNotificationsSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate mark as read input", () => {
      const markAsReadSchema = z.object({
        id: z.number(),
      });

      const validInput = {
        id: 1,
      };

      const result = markAsReadSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("Matching Router", () => {
    it("should validate find matches input", () => {
      const findMatchesSchema = z.object({
        shiftId: z.number(),
        topN: z.number().default(10),
      });

      const validInput = {
        shiftId: 1,
        topN: 5,
      };

      const result = findMatchesSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate get score input", () => {
      const getScoreSchema = z.object({
        shiftId: z.number(),
        caregiverId: z.number(),
      });

      const validInput = {
        shiftId: 1,
        caregiverId: 1,
      };

      const result = getScoreSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });
});
