import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';

export const shiftsRouter = router({
  // Get all available shifts
  listShifts: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        location: z.string().optional(),
        minRate: z.number().optional(),
        maxRate: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      // Mock data - will connect to database in Phase 3
      const mockShifts = [
        {
          id: 1,
          title: 'Home Care Assistant - Dracut',
          location: 'Dracut, MA',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 86400000 + 28800000).toISOString(),
          hourlyRate: 18.5,
          description: 'Provide personal care assistance and companionship',
          requiredQualifications: 'CPR Certification preferred',
          backgroundCheckRequired: true,
          applicants: 3,
        },
        {
          id: 2,
          title: 'Companion Care - Lowell',
          location: 'Lowell, MA',
          startTime: new Date(Date.now() + 172800000).toISOString(),
          endTime: new Date(Date.now() + 172800000 + 28800000).toISOString(),
          hourlyRate: 16.0,
          description: 'Provide companionship and household support',
          requiredQualifications: 'Experience with elderly care',
          backgroundCheckRequired: true,
          applicants: 1,
        },
        {
          id: 3,
          title: 'Household Support - Chelmsford',
          location: 'Chelmsford, MA',
          startTime: new Date(Date.now() + 259200000).toISOString(),
          endTime: new Date(Date.now() + 259200000 + 21600000).toISOString(),
          hourlyRate: 15.0,
          description: 'Assist with household tasks and errands',
          requiredQualifications: 'Reliable transportation',
          backgroundCheckRequired: false,
          applicants: 0,
        },
      ];

      return {
        shifts: mockShifts,
        total: mockShifts.length,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Get single shift details
  getShift: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // Mock data
      const shift = {
        id: input.id,
        title: 'Home Care Assistant - Dracut',
        location: 'Dracut, MA',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 28800000).toISOString(),
        hourlyRate: 18.5,
        description: 'Provide personal care assistance and companionship to elderly client',
        requiredQualifications: 'CPR Certification preferred, experience with mobility assistance',
        backgroundCheckRequired: true,
        applicants: 3,
        company: 'Elite Bridge Staffing',
        rating: 4.8,
        reviews: 24,
      };

      return shift;
    }),

  // Apply for a shift
  applyForShift: publicProcedure
    .input(
      z.object({
        shiftId: z.number(),
        userId: z.number(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Mock application
      return {
        success: true,
        applicationId: Math.floor(Math.random() * 10000),
        message: 'Application submitted successfully!',
      };
    }),

  // Save shift for later
  saveShift: publicProcedure
    .input(
      z.object({
        shiftId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        success: true,
        message: 'Shift saved for later',
      };
    }),
});
