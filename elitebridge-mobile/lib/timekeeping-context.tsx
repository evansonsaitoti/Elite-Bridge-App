import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import {
  type ClockLocation,
  getActiveEntry,
  hasOpenBreak,
  initialTimekeepingState,
  type ScheduledShift,
  type TimeEntry,
  timekeepingReducer,
} from "@/lib/timekeeping";

const STORAGE_KEY = "elitebridge.timekeeping.v1";

type StaffIdentity = {
  key: string;
  name: string;
};

type TimekeepingContextValue = {
  entries: TimeEntry[];
  ready: boolean;
  getActiveForStaff: (staffKey: string) => TimeEntry | null;
  clockIn: (
    shift: ScheduledShift,
    staff: StaffIdentity,
    location: ClockLocation | null,
  ) => TimeEntry;
  startBreak: (entryId: string) => void;
  endBreak: (entryId: string) => void;
  clockOut: (
    entryId: string,
    notes: string,
    location: ClockLocation | null,
  ) => void;
  approveEntry: (entryId: string) => void;
  requestCorrection: (entryId: string, note: string) => void;
  resubmitEntry: (entryId: string, notes: string) => void;
};

const TimekeepingContext = createContext<TimekeepingContextValue | null>(null);

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isTimeEntry(value: unknown): value is TimeEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<TimeEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.staffKey === "string" &&
    typeof entry.clockInAt === "string" &&
    Array.isArray(entry.breaks)
  );
}

export function TimekeepingProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(timekeepingReducer, initialTimekeepingState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          dispatch({ type: "hydrate", entries: parsed.filter(isTimeEntry) });
        }
      })
      .catch((error) => {
        console.warn("[Timekeeping] Could not restore entries", error);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries)).catch((error) => {
      console.warn("[Timekeeping] Could not save entries", error);
    });
  }, [ready, state.entries]);

  const getActiveForStaff = useCallback(
    (staffKey: string) => getActiveEntry(state.entries, staffKey),
    [state.entries],
  );

  const clockIn = useCallback(
    (
      shift: ScheduledShift,
      staff: StaffIdentity,
      location: ClockLocation | null,
    ) => {
      const active = getActiveEntry(state.entries, staff.key);
      if (active) {
        throw new Error("You already have an active shift.");
      }

      const now = new Date().toISOString();
      const entry: TimeEntry = {
        id: createId("time"),
        staffKey: staff.key,
        staffName: staff.name,
        shiftId: shift.id,
        clientName: shift.clientName,
        serviceType: shift.serviceType,
        locationLabel: shift.locationLabel,
        scheduledStart: shift.scheduledStart,
        scheduledEnd: shift.scheduledEnd,
        clockInAt: now,
        clockOutAt: null,
        clockInLocation: location,
        clockOutLocation: null,
        breaks: [],
        notes: "",
        status: "in_progress",
        adminNote: null,
        approvedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: "clock_in", entry });
      return entry;
    },
    [state.entries],
  );

  const startBreak = useCallback(
    (entryId: string) => {
      const entry = state.entries.find((candidate) => candidate.id === entryId);
      if (!entry || entry.status !== "in_progress") {
        throw new Error("No active shift was found.");
      }
      if (hasOpenBreak(entry)) {
        throw new Error("A break is already running.");
      }
      const now = new Date().toISOString();
      dispatch({
        type: "start_break",
        entryId,
        breakPeriod: {
          id: createId("break"),
          startedAt: now,
          endedAt: null,
        },
        updatedAt: now,
      });
    },
    [state.entries],
  );

  const endBreak = useCallback(
    (entryId: string) => {
      const entry = state.entries.find((candidate) => candidate.id === entryId);
      if (!entry || !hasOpenBreak(entry)) {
        throw new Error("No active break was found.");
      }
      dispatch({
        type: "end_break",
        entryId,
        endedAt: new Date().toISOString(),
      });
    },
    [state.entries],
  );

  const clockOut = useCallback(
    (entryId: string, notes: string, location: ClockLocation | null) => {
      const entry = state.entries.find((candidate) => candidate.id === entryId);
      if (!entry || entry.status !== "in_progress") {
        throw new Error("No active shift was found.");
      }
      const now = new Date().toISOString();
      dispatch({
        type: "clock_out",
        entryId,
        clockOutAt: now,
        location,
        notes,
      });
    },
    [state.entries],
  );

  const approveEntry = useCallback((entryId: string) => {
    dispatch({
      type: "approve",
      entryId,
      approvedAt: new Date().toISOString(),
    });
  }, []);

  const requestCorrection = useCallback((entryId: string, note: string) => {
    if (!note.trim()) {
      throw new Error("Add a correction note for the staff member.");
    }
    dispatch({
      type: "request_correction",
      entryId,
      note,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const resubmitEntry = useCallback((entryId: string, notes: string) => {
    if (!notes.trim()) {
      throw new Error("Add a response before resubmitting.");
    }
    dispatch({
      type: "resubmit",
      entryId,
      notes,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const value = useMemo<TimekeepingContextValue>(
    () => ({
      entries: state.entries,
      ready,
      getActiveForStaff,
      clockIn,
      startBreak,
      endBreak,
      clockOut,
      approveEntry,
      requestCorrection,
      resubmitEntry,
    }),
    [
      approveEntry,
      clockIn,
      clockOut,
      endBreak,
      getActiveForStaff,
      ready,
      requestCorrection,
      resubmitEntry,
      startBreak,
      state.entries,
    ],
  );

  return (
    <TimekeepingContext.Provider value={value}>
      {children}
    </TimekeepingContext.Provider>
  );
}

export function useTimekeeping(): TimekeepingContextValue {
  const context = useContext(TimekeepingContext);
  if (!context) {
    throw new Error("useTimekeeping must be used inside TimekeepingProvider.");
  }
  return context;
}
