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

export async function clearCaregiverBackendSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
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
