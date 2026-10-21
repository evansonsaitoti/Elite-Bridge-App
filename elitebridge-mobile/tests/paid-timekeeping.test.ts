import { describe, expect, it } from "vitest";
import { calculateBreakMilliseconds, calculateWorkedHours, calculateWorkedMilliseconds, type TimeEntry } from "../lib/timekeeping";

const entry: TimeEntry = {
  id: "shift-1", shiftId: "1", staffKey: "caregiver", staffName: "Caregiver",
  clientName: "Assigned visit", serviceType: "Companionship", locationLabel: "Manchester",
  scheduledStart: "2026-10-21T12:00:00Z", scheduledEnd: "2026-10-21T20:00:00Z",
  clockInAt: "2026-10-21T12:00:00Z", clockOutAt: "2026-10-21T20:00:00Z",
  clockInLocation: null, clockOutLocation: null,
  breaks: [{ id: "b1", startedAt: "2026-10-21T16:00:00Z", endedAt: "2026-10-21T16:30:00Z" }],
  notes: "", status: "completed", agencyNote: null, approvedAt: null,
  createdAt: "2026-10-21T12:00:00Z", updatedAt: "2026-10-21T20:00:00Z",
};

describe("caregiver paid timekeeping", () => {
  it("includes explicitly paid breaks in worked hours", () => {
    expect(calculateBreakMilliseconds(entry)).toBe(30 * 60000);
    expect(calculateWorkedHours(entry)).toBe(8);
  });
  it("uses authoritative backend worked minutes for completed timesheets", () => {
    const e = { ...entry, approvedWorkedMinutes: 479 };
    expect(calculateWorkedMilliseconds(e)).toBe(479 * 60000);
    expect(calculateWorkedHours(e)).toBe(7.98);
  });
  it("never returns negative worked time", () => {
    const e = { ...entry, approvedWorkedMinutes: -10 };
    expect(calculateWorkedMilliseconds(e)).toBe(0);
  });
});
