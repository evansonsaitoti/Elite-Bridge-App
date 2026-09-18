import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { clockInToShift, clockOutOfShift, fetchMyApplications, fetchMyTimekeeping, recordShiftBreak, resubmitTimesheet, type CaregiverApplication, type SharedTimeActivity, type SharedTimesheet } from "@/lib/shared-api";
import type { ClockLocation, ScheduledShift, TimeEntry } from "@/lib/timekeeping";

// Keep the existing clock UI, but read and write the same records as the web app.
export function useSharedTimekeeping() {
  const [applications, setApplications] = useState<CaregiverApplication[]>([]);
  const [activities, setActivities] = useState<SharedTimeActivity[]>([]);
  const [timesheets, setTimesheets] = useState<SharedTimesheet[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const [assignments, records] = await Promise.all([fetchMyApplications(), fetchMyTimekeeping()]);
      if (generation.current !== current) return;
      setApplications(assignments); setActivities(records.activities); setTimesheets(records.timesheets); setError("");
    } catch (e) {
      if (generation.current === current) setError(e instanceof Error ? e.message : "Unable to sync time records");
    } finally { if (generation.current === current) setReady(true); }
  }, []);
  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => { clearInterval(timer); generation.current++; };
  }, [refresh]));

  const entries: TimeEntry[] = activities.filter(a => a.type === "clock_in").map(start => {
    const shift = applications.find(a => a.shift.id === start.shift_id)?.shift;
    const events = activities.filter(a => a.shift_id === start.shift_id && a.id > start.id);
    const end = events.find(a => a.type === "clock_out");
    const sheet = timesheets.find(t => t.shift_id === start.shift_id);
    return {
      id: String(start.shift_id), shiftId: String(start.shift_id), staffKey: "current", staffName: "You",
      clientName: shift?.title || "Assigned shift", serviceType: shift?.serviceType || "Care shift",
      locationLabel: shift ? `${shift.location.address}, ${shift.location.city}` : "",
      scheduledStart: shift?.startTime || start.timestamp, scheduledEnd: shift?.endTime || start.timestamp,
      clockInAt: start.timestamp, clockOutAt: end?.timestamp || null,
      clockInLocation: start.location, clockOutLocation: end?.location || null,
      breaks: events.filter(a => a.type === "break_start" && (!end || a.id < end.id)).map(b => ({ id: String(b.id), startedAt: b.timestamp, endedAt: events.find(a => a.type === "break_end" && a.id > b.id)?.timestamp || null })),
      notes: sheet?.notes || "", status: !end ? "in_progress" : sheet?.status === "approved" ? "approved" : sheet?.status === "correction_requested" ? "correction_requested" : "completed",
      agencyNote: sheet?.agency_note || null, approvedAt: sheet?.approved_at || null,
      createdAt: start.timestamp, updatedAt: sheet?.updated_at || start.timestamp,
    };
  });
  const shifts: ScheduledShift[] = applications.filter(a => a.status === "approved" && ["open", "assigned", "in_progress"].includes(a.shift.status) && !timesheets.some(t => t.shift_id === a.shift.id)).map(({ shift }) => ({
    id: String(shift.id), clientName: shift.title, serviceType: shift.serviceType,
    locationLabel: `${shift.location.address}, ${shift.location.city}`, scheduledStart: shift.startTime, scheduledEnd: shift.endTime,
  }));
  return {
    ready, error, refresh, entries, shifts,
    getActiveForStaff: (_key: string) => entries.find(e => !e.clockOutAt) || null,
    clockIn: async (shift: ScheduledShift, _staff: unknown, location: ClockLocation | null) => { await clockInToShift(Number(shift.id), location); await refresh(); },
    clockOut: async (id: string, notes: string, location: ClockLocation | null) => { await clockOutOfShift(Number(id), notes, location); await refresh(); },
    startBreak: async (id: string) => { await recordShiftBreak(Number(id), "start"); await refresh(); },
    endBreak: async (id: string) => { await recordShiftBreak(Number(id), "end"); await refresh(); },
    resubmitEntry: async (id: string, notes: string) => {
      const sheet = timesheets.find(t => t.shift_id === Number(id));
      if (!sheet) throw new Error("Refresh your timesheets and try again");
      await resubmitTimesheet(sheet.id, notes); await refresh();
    },
  };
}
