import { AppError } from "../middleware/errorHandler";

// Store UTC instants in the existing timestamp columns; never reinterpret old rows.
export function scheduledInstant(date: string, time: string, zone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new AppError(400, "Use YYYY-MM-DD and 24-hour HH:MM for the shift schedule");
  }
  const wall = new Date(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 10) !== date) {
    throw new AppError(400, "Invalid shift date");
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  } catch { throw new AppError(400, "Invalid shift time zone"); }
  const wallAt = (instant: number) => {
    const p = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
    return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  };
  const target = wall.getTime();
  const offsets = new Set([-36, 0, 36].map(h => { const instant = target + h * 3600000; return wallAt(instant) - instant; }));
  const candidates = [...offsets].map(offset => target - offset).filter(instant => wallAt(instant) === target);
  if (candidates.length !== 1) throw new AppError(400, "This time is skipped or repeated by daylight saving time. Choose an unambiguous start/end time.");
  return new Date(candidates[0]);
}

export function shiftSchedule(input: { startDate: string; endDate?: string; startTime: string; endTime: string; timeZone?: string }) {
  const zone = input.timeZone || "UTC"; // compatibility for existing builds
  const start = scheduledInstant(input.startDate, input.startTime, zone);
  let endDate = input.endDate || input.startDate;
  if (!input.endDate && input.endTime < input.startTime) {
    endDate = new Date(Date.parse(`${input.startDate}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  }
  const end = scheduledInstant(endDate, input.endTime, zone);
  if (end <= start || end.getTime() - start.getTime() > 26 * 3600000) throw new AppError(400, "Shift must end after it starts and last no more than 26 hours");
  return { start, end, zone };
}
