export type TimeEntryStatus =
  | "in_progress"
  | "completed"
  | "approved"
  | "correction_requested";

export type ClockLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
};

export type BreakPeriod = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

export type ScheduledShift = {
  id: string;
  clientName: string;
  serviceType: string;
  locationLabel: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export type TimeEntry = {
  id: string;
  staffKey: string;
  staffName: string;
  shiftId: string;
  clientName: string;
  serviceType: string;
  locationLabel: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockInAt: string;
  clockOutAt: string | null;
  clockInLocation: ClockLocation | null;
  clockOutLocation: ClockLocation | null;
  breaks: BreakPeriod[];
  notes: string;
  status: TimeEntryStatus;
  adminNote: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TimekeepingState = {
  entries: TimeEntry[];
};

export type TimekeepingAction =
  | { type: "hydrate"; entries: TimeEntry[] }
  | { type: "clock_in"; entry: TimeEntry }
  | { type: "start_break"; entryId: string; breakPeriod: BreakPeriod; updatedAt: string }
  | { type: "end_break"; entryId: string; endedAt: string }
  | {
      type: "clock_out";
      entryId: string;
      clockOutAt: string;
      location: ClockLocation | null;
      notes: string;
    }
  | { type: "approve"; entryId: string; approvedAt: string }
  | { type: "request_correction"; entryId: string; note: string; updatedAt: string }
  | { type: "resubmit"; entryId: string; notes: string; updatedAt: string };

export const initialTimekeepingState: TimekeepingState = {
  entries: [],
};

export function timekeepingReducer(
  state: TimekeepingState,
  action: TimekeepingAction,
): TimekeepingState {
  switch (action.type) {
    case "hydrate":
      return { entries: action.entries };
    case "clock_in":
      return { entries: [action.entry, ...state.entries] };
    case "start_break":
      return {
        entries: state.entries.map((entry) =>
          entry.id === action.entryId
            ? {
                ...entry,
                breaks: [...entry.breaks, action.breakPeriod],
                updatedAt: action.updatedAt,
              }
            : entry,
        ),
      };
    case "end_break":
      return {
        entries: state.entries.map((entry) =>
          entry.id === action.entryId
            ? {
                ...entry,
                breaks: entry.breaks.map((period) =>
                  period.endedAt
                    ? period
                    : { ...period, endedAt: action.endedAt },
                ),
                updatedAt: action.endedAt,
              }
            : entry,
        ),
      };
    case "clock_out":
      return {
        entries: state.entries.map((entry) =>
          entry.id === action.entryId
            ? {
                ...entry,
                clockOutAt: action.clockOutAt,
                clockOutLocation: action.location,
                breaks: entry.breaks.map((period) =>
                  period.endedAt
                    ? period
                    : { ...period, endedAt: action.clockOutAt },
                ),
                notes: action.notes.trim(),
                status: "completed",
                adminNote: null,
                updatedAt: action.clockOutAt,
              }
            : entry,
        ),
      };
    case "approve":
      return {
        entries: state.entries.map((entry) =>
          entry.id === action.entryId
            ? {
                ...entry,
                status: "approved",
                adminNote: null,
                approvedAt: action.approvedAt,
                updatedAt: action.approvedAt,
              }
            : entry,
        ),
      };
    case "request_correction":
      return {
        entries: state.entries.map((entry) =>
          entry.id === action.entryId
            ? {
                ...entry,
                status: "correction_requested",
                adminNote: action.note.trim(),
                approvedAt: null,
                updatedAt: action.updatedAt,
              }
            : entry,
        ),
      };
    case "resubmit":
      return {
        entries: state.entries.map((entry) =>
          entry.id === action.entryId
            ? {
                ...entry,
                status: "completed",
                notes: action.notes.trim(),
                adminNote: null,
                updatedAt: action.updatedAt,
              }
            : entry,
        ),
      };
    default:
      return state;
  }
}

export function calculateBreakMilliseconds(entry: TimeEntry, now = new Date()): number {
  return entry.breaks.reduce((total, period) => {
    const startedAt = new Date(period.startedAt).getTime();
    const endedAt = period.endedAt
      ? new Date(period.endedAt).getTime()
      : now.getTime();
    return total + Math.max(0, endedAt - startedAt);
  }, 0);
}

export function calculateWorkedMilliseconds(entry: TimeEntry, now = new Date()): number {
  const startedAt = new Date(entry.clockInAt).getTime();
  const endedAt = entry.clockOutAt
    ? new Date(entry.clockOutAt).getTime()
    : now.getTime();
  return Math.max(0, endedAt - startedAt - calculateBreakMilliseconds(entry, now));
}

export function calculateWorkedHours(entry: TimeEntry): number {
  return Number((calculateWorkedMilliseconds(entry) / 3_600_000).toFixed(2));
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function getActiveEntry(entries: TimeEntry[], staffKey: string): TimeEntry | null {
  return (
    entries.find(
      (entry) => entry.staffKey === staffKey && entry.status === "in_progress",
    ) ?? null
  );
}

export function hasOpenBreak(entry: TimeEntry): boolean {
  return entry.breaks.some((period) => !period.endedAt);
}
