import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';

export const applicationsRouter = router({
  // Get user's applications
  getUserApplications: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      // Mock data
      const applications = [
        {
          id: 1,
          shiftId: 1,
          shiftTitle: 'Home Care Assistant - Dracut',
          company: 'Elite Bridge Staffing',
          status: 'approved',
          appliedAt: new Date(Date.now() - 86400000).toISOString(),
          respondedAt: new Date(Date.now() - 43200000).toISOString(),
          shiftDate: new Date(Date.now() + 86400000).toISOString(),
          hourlyRate: 18.5,
          location: 'Dracut, MA',
        },
        {
          id: 2,
          shiftId: 2,
          shiftTitle: 'Companion Care - Lowell',
          company: 'Elite Bridge Staffing',
          status: 'pending',
          appliedAt: new Date(Date.now() - 172800000).toISOString(),
          respondedAt: null,
          shiftDate: new Date(Date.now() + 172800000).toISOString(),
          hourlyRate: 16.0,
          location: 'Lowell, MA',
        },
      ];

      return {
        applications,
        total: applications.length,
      };
    }),

  // Get application details
  getApplication: publicProcedure
    .input(z.object({ applicationId: z.number() }))
    .query(async ({ input }) => {
      // Mock data
      return {
        id: input.applicationId,
        shiftId: 1,
        shiftTitle: 'Home Care Assistant - Dracut',
        company: 'Elite Bridge Staffing',
        status: 'approved',
        appliedAt: new Date(Date.now() - 86400000).toISOString(),
        respondedAt: new Date(Date.now() - 43200000).toISOString(),
        shiftDate: new Date(Date.now() + 86400000).toISOString(),
        hourlyRate: 18.5,
        location: 'Dracut, MA',
        description: 'Provide personal care assistance and companionship',
        message: 'Great experience! We look forward to working with you.',
      };
    }),

  // Withdraw application
  withdrawApplication: publicProcedure
    .input(z.object({ applicationId: z.number() }))
    .mutation(async ({ input }) => {
      return {
        success: true,
        message: 'Application withdrawn',
      };
    }),
});
