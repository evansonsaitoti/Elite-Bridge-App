import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { calculateMatchScore, findBestMatches } from "./matching-engine";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Shift Management Router
  shifts: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(({ input }) => db.listOpenShifts(input.limit, input.offset)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getShiftById(input.id)),

    create: protectedProcedure
      .input(
        z.object({
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
        })
      )
      .mutation(({ ctx, input }) => {
        // Only admins can create shifts
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized: Only admins can create shifts");
        }
        return db.createShift({
          ...input,
          createdBy: ctx.user.id,
          status: "open",
        } as any);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z
            .enum(["open", "in_progress", "completed", "cancelled"])
            .optional(),
          hourlyRate: z.number().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }
        const { id, ...data } = input;
        return db.updateShift(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }
        return db.deleteShift(input.id);
      }),
  }),

  // Caregiver Preferences Router
  preferences: router({
    get: protectedProcedure.query(({ ctx }) =>
      db.getCaregiverPreferences(ctx.user.id)
    ),

    update: protectedProcedure
      .input(
        z.object({
          mondayAvailable: z.boolean().optional(),
          mondayStartTime: z.string().optional(),
          mondayEndTime: z.string().optional(),
          tuesdayAvailable: z.boolean().optional(),
          tuesdayStartTime: z.string().optional(),
          tuesdayEndTime: z.string().optional(),
          wednesdayAvailable: z.boolean().optional(),
          wednesdayStartTime: z.string().optional(),
          wednesdayEndTime: z.string().optional(),
          thursdayAvailable: z.boolean().optional(),
          thursdayStartTime: z.string().optional(),
          thursdayEndTime: z.string().optional(),
          fridayAvailable: z.boolean().optional(),
          fridayStartTime: z.string().optional(),
          fridayEndTime: z.string().optional(),
          saturdayAvailable: z.boolean().optional(),
          saturdayStartTime: z.string().optional(),
          saturdayEndTime: z.string().optional(),
          sundayAvailable: z.boolean().optional(),
          sundayStartTime: z.string().optional(),
          sundayEndTime: z.string().optional(),
          elderCareWilling: z.boolean().optional(),
          childCareWilling: z.boolean().optional(),
          disabilityCareWilling: z.boolean().optional(),
          minHourlyRate: z.number().optional(),
          maxHoursPerWeek: z.number().optional(),
          travelPreference: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existingPrefs = await db.getCaregiverPreferences(ctx.user.id);
        if (existingPrefs) {
          await db.updateCaregiverPreferences(ctx.user.id, input as any);
          return { success: true };
        } else {
          const id = await db.createCaregiverPreferences({
            caregiverId: ctx.user.id,
            ...input,
          } as any);
          return { success: true, id };
        }
      }),
  }),

  // Shift Matching Router
  matching: router({
    findMatches: protectedProcedure
      .input(
        z.object({
          shiftId: z.number(),
          topN: z.number().default(10),
        })
      )
      .query(async ({ input, ctx }) => {
        // Only admins can find matches
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        const shift = await db.getShiftById(input.shiftId);
        if (!shift) throw new Error("Shift not found");

        // In production, fetch all caregiver IDs from database
        // For now, return empty array
        const allCaregiverIds: number[] = [];
        return findBestMatches(shift, allCaregiverIds, input.topN);
      }),

    getScore: protectedProcedure
      .input(
        z.object({
          shiftId: z.number(),
          caregiverId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }

        const shift = await db.getShiftById(input.shiftId);
        if (!shift) throw new Error("Shift not found");
        return calculateMatchScore(shift, input.caregiverId);
      }),
  }),

  // Shift Offers Router
  offers: router({
    listPending: protectedProcedure.query(({ ctx }) =>
      db.listPendingOffers(ctx.user.id)
    ),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getShiftOffer(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          shiftId: z.number(),
          caregiverId: z.number(),
          offerMessage: z.string().optional(),
          expiresAt: z.date(),
        })
      )
      .mutation(({ ctx, input }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Unauthorized");
        }
        return db.createShiftOffer(input);
      }),

    accept: protectedProcedure
      .input(z.object({ offerId: z.number() }))
      .mutation(({ input }) =>
        db.updateShiftOfferStatus(input.offerId, "accepted")
      ),

    decline: protectedProcedure
      .input(z.object({ offerId: z.number() }))
      .mutation(({ input }) =>
        db.updateShiftOfferStatus(input.offerId, "declined")
      ),
  }),

  // Ratings Router
  ratings: router({
    submit: protectedProcedure
      .input(
        z.object({
          caregiverId: z.number(),
          shiftId: z.number().optional(),
          rating: z.number().min(1).max(5),
          review: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        return db.submitRating({
          caregiverId: input.caregiverId,
          clientId: ctx.user.id,
          shiftId: input.shiftId,
          rating: input.rating,
          review: input.review,
        } as any);
      }),

    list: publicProcedure
      .input(z.object({ caregiverId: z.number() }))
      .query(({ input }) => db.getCaregiverRatings(input.caregiverId)),

    getAverage: publicProcedure
      .input(z.object({ caregiverId: z.number() }))
      .query(({ input }) => db.getAverageRating(input.caregiverId)),
  }),

  // Notifications Router
  notifications: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(({ ctx, input }) =>
        db.listNotifications(ctx.user.id, input.limit, input.offset)
      ),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.markNotificationAsRead(input.id)),

    getUnreadCount: protectedProcedure.query(({ ctx }) =>
      db.getUnreadNotificationCount(ctx.user.id)
    ),
  }),

  // Background Check Router
  backgroundCheck: router({
    submitCheckrRequest: protectedProcedure
      .input(
        z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email(),
          phoneNumber: z.string().optional(),
          dateOfBirth: z.string().optional(),
          ssn: z.string().optional(),
          driversLicenseNumber: z.string().optional(),
          driversLicenseState: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Only staff can submit their own background check
        if (ctx.user?.role !== "staff") {
          throw new Error("Unauthorized");
        }

        try {
          // Import Checkr service
          const { createCheckrCandidate, inviteCheckrCandidate } = await import("./_core/checkr");

          // Create candidate in Checkr
          const candidateResult = await createCheckrCandidate({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phoneNumber: input.phoneNumber,
            dateOfBirth: input.dateOfBirth,
            ssn: input.ssn,
            driversLicenseNumber: input.driversLicenseNumber,
            driversLicenseState: input.driversLicenseState,
          });

          if (!candidateResult.success) {
            throw new Error(candidateResult.error || "Failed to create Checkr candidate");
          }

          // Invite candidate to complete background check
          const invitationResult = await inviteCheckrCandidate(candidateResult.candidateId, "basic");

          if (!invitationResult.success) {
            throw new Error(invitationResult.error || "Failed to invite candidate");
          }

          // Store candidate ID for future reference
          // TODO: Add database function to store background check status
          // await db.updateUserBackgroundCheck(ctx.user.id, {
          //   checkrCandidateId: candidateResult.candidateId,
          //   status: "submitted",
          //   submittedAt: new Date(),
          // });

          return {
            success: true,
            candidateId: candidateResult.candidateId,
            invitationId: invitationResult.invitationId,
            message: "Background check submitted successfully",
          };
        } catch (error: any) {
          console.error("Background check submission error:", error);
          return {
            success: false,
            error: error.message || "Failed to submit background check",
          };
        }
      }),

    getStatus: protectedProcedure
      .input(z.object({ candidateId: z.string() }))
      .query(async ({ input }) => {
        try {
          const { getBackgroundCheckStatus } = await import("./_core/checkr");
          const result = await getBackgroundCheckStatus(input.candidateId);
          return result;
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
