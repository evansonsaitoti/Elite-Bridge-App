const LOCAL_SHIFTS_KEY = "eliteBridgeEmployerShifts";

type LocalShift = {
  id: number;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
};

function getStoredShifts(): LocalShift[] {
  try {
    const raw = localStorage.getItem(LOCAL_SHIFTS_KEY);
    return raw ? (JSON.parse(raw) as LocalShift[]) : [];
  } catch {
    return [];
  }
}

function saveStoredShifts(shifts: LocalShift[]) {
  localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(shifts));
}

export const localShiftClient = {
  createShift(data: any) {
    const now = new Date().toISOString();
    const shift: LocalShift = {
      ...data,
      id: Date.now(),
      status: "open",
      createdAt: now,
      updatedAt: now,
    };

    const shifts = getStoredShifts();
    saveStoredShifts([shift, ...shifts]);

    return {
      message: "Shift posted successfully",
      shift,
    };
  },

  getMyShifts() {
    return {
      shifts: getStoredShifts(),
    };
  },

  closeShift(shiftId: number) {
    const shifts = getStoredShifts();
    const updatedShifts = shifts.map((shift) =>
      shift.id === shiftId
        ? { ...shift, status: "closed" as const, updatedAt: new Date().toISOString() }
        : shift,
    );
    const shift = updatedShifts.find((item) => item.id === shiftId);
    saveStoredShifts(updatedShifts);

    return {
      message: "Shift closed",
      shift,
    };
  },
};
