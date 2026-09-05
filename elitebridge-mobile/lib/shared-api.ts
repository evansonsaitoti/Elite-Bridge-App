import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "elitebridge-caregiver-api-token-v1";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "caregiver" | "employer" | "admin";
};

export type CaregiverShift = {
  id: number;
  employerId: number;
  employerName?: string;
  title: string;
  serviceType: string;
  caregiverType: string;
  careRecipientName?: string;
  startTime: string;
  endTime: string;
  location: { type: string; address: string; city: string; state: string; zipCode: string };
  hourlyRate: number;
  requirements: string[];
  responsibilities: string;
  urgency: "standard" | "urgent";
  assignmentMode?: "instant" | "review";
  status: string;
  applicationStatus?: "pending" | "approved" | "rejected" | "callout";
};

export type CaregiverApplication = {
  id: number;
  status: "pending" | "approved" | "rejected" | "callout";
  note?: string;
  appliedAt: string;
  shift: CaregiverShift;
};

export type RescueOffer = {
  id: number;
  score: number;
  rationale: string;
  status: "offered" | "accepted";
  offeredAt: string;
  shift: CaregiverShift;
};

export type CalloutReason = "illness" | "family_emergency" | "transportation" | "schedule_conflict" | "other";

export type ClockLocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  capturedAt?: string;
};

export type CaregiverTimesheet = {
  id: number;
  shiftId: number;
  caregiverId: number;
  shiftTitle?: string;
  serviceType?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  clockInAt: string;
  clockOutAt?: string | null;
  clockInLocation?: ClockLocationPayload | null;
  clockOutLocation?: ClockLocationPayload | null;
  breaks: { startedAt: string; endedAt: string | null }[];
  notes?: string | null;
  status: "in_progress" | "submitted" | "approved" | "correction_requested";
  employerNote?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  workedHours: number;
  hourlyRate: number;
  grossAmount: number;
};

export type CaregiverNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
};

export type CaregiverProfile = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  hourlyRate: string | number;
  yearsExperience?: number | null;
  specialties?: string[];
  certifications?: string[];
  rating?: string | number;
  verificationStatus: string;
  emailVerified?: boolean;
};

export const sharedApiConfigured = Boolean(API_BASE_URL);

async function request<T>(path: string, init: RequestInit = {}, includeAuth = true): Promise<T> {
  if (!API_BASE_URL) throw new Error("Shared API is not configured");
  const token = includeAuth ? await AsyncStorage.getItem(TOKEN_KEY) : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Request failed (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body as T;
}

async function login(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
}

export async function ensureCaregiverBackendSession(email: string, password: string): Promise<AuthUser> {
  if (!API_BASE_URL) throw new Error("Elite Bridge cannot reach the secure agency service in this build.");
  const result = await login(email.trim().toLowerCase(), password);
  if (result.user.role !== "caregiver") {
    throw new Error("This account is not a caregiver account. Agency administrators should use Elite Bridge Employer.");
  }
  await AsyncStorage.setItem(TOKEN_KEY, result.token);
  return result.user;
}

export async function registerCaregiverAccount(input: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const result = await request<{ token: string; user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...input, email: input.email.trim().toLowerCase(), role: "caregiver" }),
  }, false);
  if (result.user.role !== "caregiver") throw new Error("The service did not create a caregiver account.");
  await AsyncStorage.setItem(TOKEN_KEY, result.token);
  return result.user;
}

export async function registerCaregiverDevice(token: string, platform: "ios" | "android") {
  await request<void>("/api/notifications/device", {
    method: "POST",
    body: JSON.stringify({ token, platform, app: "caregiver" }),
  });
}

export async function removeCaregiverDevice(token: string) {
  await request<void>("/api/notifications/device", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });
}

export async function clearCaregiverBackendSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function deleteCaregiverBackendAccount(): Promise<"deleted" | "local-only"> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return "local-only";
  await request<void>("/api/auth/account", { method: "DELETE" });
  await AsyncStorage.removeItem(TOKEN_KEY);
  return "deleted";
}

export async function fetchOpenShifts(): Promise<CaregiverShift[]> {
  const result = await request<{ shifts: CaregiverShift[] }>("/api/bookings/open");
  return result.shifts;
}

export async function applyToShift(shiftId: number, note = "") {
  return request<{ application: { id: number; status: string } }>(`/api/bookings/${shiftId}/apply`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function claimMatchedShift(shiftId: number) {
  return request<{ application: { id: number; status: "approved" }; shift: { id: number; status: "assigned" } }>(`/api/bookings/${shiftId}/claim`, {
    method: "POST",
  });
}

export async function syncCaregiverMatchingProfile(input: { availability: string[]; preferredServices: string[]; maxDistanceMiles: string; instantOffers: boolean }) {
  await request<{ message: string }>("/api/caregivers/me/matching", {
    method: "PUT",
    body: JSON.stringify({ ...input, maxDistanceMiles: Number(input.maxDistanceMiles) }),
  });
}

export async function fetchMyApplications(): Promise<CaregiverApplication[]> {
  const result = await request<{ applications: CaregiverApplication[] }>("/api/bookings/caregiver/my-applications");
  return result.applications;
}

export async function callOutOfShift(shiftId: number, reason: CalloutReason, note = "") {
  return request<{ callout: { id: number; status: string }; shift: { id: number; status: string; urgency: string } }>(
    `/api/bookings/${shiftId}/callout`,
    { method: "POST", body: JSON.stringify({ reason, note }) },
  );
}

export async function fetchRescueOffers(): Promise<RescueOffer[]> {
  const result = await request<{ offers: RescueOffer[] }>("/api/bookings/caregiver/offers");
  return result.offers;
}

export async function respondToRescueOffer(offerId: number, status: "accepted" | "declined") {
  return request<{ offer: { id: number; status: string }; nextStep: string }>(
    `/api/bookings/caregiver/offers/${offerId}/respond`,
    { method: "POST", body: JSON.stringify({ status }) },
  );
}

export async function fetchCaregiverTimesheets(): Promise<CaregiverTimesheet[]> {
  const result = await request<{ timesheets: CaregiverTimesheet[] }>("/api/bookings/caregiver/timesheets");
  return result.timesheets;
}

export async function clockInToShift(shiftId: number, location: ClockLocationPayload | null) {
  return request<{ timesheet: CaregiverTimesheet }>(`/api/bookings/${shiftId}/clock-in`, {
    method: "POST",
    body: JSON.stringify({ location }),
  });
}

export async function startShiftBreak(shiftId: number) {
  return request<{ timesheet: CaregiverTimesheet }>(`/api/bookings/${shiftId}/break-start`, { method: "POST" });
}

export async function endShiftBreak(shiftId: number) {
  return request<{ timesheet: CaregiverTimesheet }>(`/api/bookings/${shiftId}/break-end`, { method: "POST" });
}

export async function clockOutOfShift(shiftId: number, notes: string, location: ClockLocationPayload | null) {
  return request<{ timesheet: CaregiverTimesheet }>(`/api/bookings/${shiftId}/clock-out`, {
    method: "POST",
    body: JSON.stringify({ notes, location }),
  });
}

export async function resubmitCaregiverTimesheet(timesheetId: number, note: string) {
  return request<{ timesheet: CaregiverTimesheet }>(`/api/bookings/caregiver/timesheets/${timesheetId}/resubmit`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}

export async function fetchCaregiverNotifications(): Promise<CaregiverNotification[]> {
  const result = await request<{ notifications: CaregiverNotification[] }>("/api/notifications");
  return result.notifications;
}

export async function markCaregiverNotificationRead(id: number) {
  await request<void>(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllCaregiverNotificationsRead() {
  await request<void>("/api/notifications/read-all", { method: "POST" });
}

export async function getCaregiverProfile(): Promise<CaregiverProfile> {
  const result = await request<{ profile: CaregiverProfile }>("/api/caregivers/me");
  return result.profile;
}

export async function updateCaregiverProfile(input: { phone?: string; bio?: string; hourlyRate?: number; yearsExperience?: number; specialties?: string[]; certifications?: string[] }) {
  const result = await request<{ profile: CaregiverProfile }>("/api/caregivers/me", { method: "PUT", body: JSON.stringify(input) });
  return result.profile;
}
