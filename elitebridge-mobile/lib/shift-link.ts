export function parseShiftId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
export function shiftOpportunityRoute(value: unknown) {
  const id = parseShiftId(value);
  return id ? { pathname: "/(staff)/opportunities" as const, params: { shiftId: String(id) } } : "/(staff)/opportunities" as const;
}
