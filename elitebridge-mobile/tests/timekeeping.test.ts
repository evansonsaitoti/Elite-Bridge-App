import { describe, expect, it } from "vitest";

import {
  calculateBreakMilliseconds,
  calculateWorkedMilliseconds,
  formatDuration,
  getActiveEntry,
  initialTimekeepingState,
  type TimeEntry,
  type TimekeepingState,
  timekeepingReducer,
} from "../lib/timekeeping";

const baseEntry: TimeEntry = {
  id: "time-1",
  staffKey: "staff@example.com",
  staffName: "Staff Member",
  shiftId: "shift-1",
  clientName: "Private Client",
  serviceType: "Companionship",
  locationLabel: "Dracut, MA",
  scheduledStart: "2026-07-24T12:00:00.000Z",
  scheduledEnd: "2026-07-24T20:00:00.000Z",
  clockInAt: "2026-07-24T12:00:00.000Z",
  clockOutAt: null,
  clockInLocation: null,
  clockOutLocation: null,
  breaks: [],
  notes: "",
  status: "in_progress",
  adminNote: null,
  approvedAt: null,
  createdAt: "2026-07-24T12:00:00.000Z",
  updatedAt: "2026-07-24T12:00:00.000Z",
};

describe("timekeepingReducer", () => {
  it("clocks in and exposes the active entry", () => {
    const state = timekeepingReducer(initialTimekeepingState, {
      type: "clock_in",
      entry: baseEntry,
    });

    expect(state.entries).toHaveLength(1);
    expect(getActiveEntry(state.entries, baseEntry.staffKey)?.id).toBe("time-1");
  });

  it("tracks a completed break and subtracts it from worked time", () => {
    let state = timekeepingReducer(initialTimekeepingState, {
      type: "clock_in",
      entry: baseEntry,
    });
    state = timekeepingReducer(state, {
      type: "start_break",
      entryId: baseEntry.id,
      breakPeriod: {
        id: "break-1",
        startedAt: "2026-07-24T14:00:00.000Z",
        endedAt: null,
      },
      updatedAt: "2026-07-24T14:00:00.000Z",
    });
    state = timekeepingReducer(state, {
      type: "end_break",
      entryId: baseEntry.id,
      endedAt: "2026-07-24T14:30:00.000Z",
    });
    state = timekeepingReducer(state, {
      type: "clock_out",
      entryId: baseEntry.id,
      clockOutAt: "2026-07-24T20:00:00.000Z",
      location: null,
      notes: "Visit completed",
    });

    const completed = state.entries[0];
    expect(completed.status).toBe("completed");
    expect(calculateBreakMilliseconds(completed)).toBe(30 * 60 * 1000);
    expect(calculateWorkedMilliseconds(completed)).toBe(7.5 * 60 * 60 * 1000);
    expect(formatDuration(calculateWorkedMilliseconds(completed))).toBe("07:30:00");
  });

  it("supports correction requests, resubmission and approval", () => {
    let state: TimekeepingState = {
      entries: [
        {
          ...baseEntry,
          status: "completed" as const,
          clockOutAt: "2026-07-24T20:00:00.000Z",
        },
      ],
    };

    state = timekeepingReducer(state, {
      type: "request_correction",
      entryId: baseEntry.id,
      note: "Explain the late clock-out.",
      updatedAt: "2026-07-24T20:05:00.000Z",
    });
    expect(state.entries[0].status).toBe("correction_requested");
    expect(state.entries[0].adminNote).toBe("Explain the late clock-out.");

    state = timekeepingReducer(state, {
      type: "resubmit",
      entryId: baseEntry.id,
      notes: "Client requested additional support.",
      updatedAt: "2026-07-24T20:10:00.000Z",
    });
    expect(state.entries[0].status).toBe("completed");
    expect(state.entries[0].adminNote).toBeNull();

    state = timekeepingReducer(state, {
      type: "approve",
      entryId: baseEntry.id,
      approvedAt: "2026-07-24T20:15:00.000Z",
    });
    expect(state.entries[0].status).toBe("approved");
    expect(state.entries[0].approvedAt).toBe("2026-07-24T20:15:00.000Z");
  });
});
