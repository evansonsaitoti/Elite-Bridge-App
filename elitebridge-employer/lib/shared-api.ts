import AsyncStorage from "@react-native-async-storage/async-storage";

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const TOKEN_KEY = "elitebridge-employer-api-token-v1";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "caregiver" | "employer" | "admin";
};

export type SharedShift = {
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
  notes?: string;
  urgency: "standard" | "urgent";
  status: string;
};

export type ShiftDraft = {
  client: string;
  service: string;
  caregiverType: string;
  startDate: string;
  startTime: string;
  endTime: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  hourlyRate: number;
  responsibilities: string;
  contactName: string;
  contactPhone: string;
  urgency: "standard" | "urgent";
};

export type EmployerApplication = {
  id: number;
  shift_id: number;
  caregiver_id: number;
  status: "pending" | "approved" | "rejected" | "callout";
  note?: string;
  created_at: string;
  shift_title: string;
  service_type: string;
  start_time: string;
  end_time: string;
  city: string;
  state: string;
  caregiver_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  rating?: string | number;
  total_hours?: string | number;
  certifications?: string[];
};

export type EmployerCallout = {
  id: number;
  shift_id: number;
  reason: string;
  note?: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at?: string;
  title: string;
  service_type: string;
  care_recipient_name?: string;
  start_time: string;
  end_time: string;
  city: string;
  state: string;
  hourly_rate: string | number;
  urgency: string;
  first_name: string;
  last_name: string;
  offers_sent: number;
  offers_accepted: number;
};

export type RescueCandidate = {
  caregiverId: number;
  name: string;
  score: number;
  rationale: string;
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

export async function ensureEmployerBackendSession(email: string, password: string): Promise<AuthUser> {
  if (!API_BASE_URL) throw new Error("Elite Bridge Employer cannot reach the secure agency service in this build.");
  const result = await login(email.trim().toLowerCase(), password);
  if (result.user.role !== "employer" && result.user.role !== "admin") {
    throw new Error("This account is not an employer account. Caregivers should use the Elite Bridge caregiver app.");
  }
  await AsyncStorage.setItem(TOKEN_KEY, result.token);
  return result.user;
}

export async function clearEmployerBackendSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function deleteEmployerBackendAccount(): Promise<"deleted" | "local-only"> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return "local-only";
  await request<void>("/api/auth/account", { method: "DELETE" });
  await AsyncStorage.removeItem(TOKEN_KEY);
  return "deleted";
}

export async function fetchEmployerShifts(): Promise<SharedShift[]> {
  const result = await request<{ shifts: SharedShift[] }>("/api/bookings/employer/my");
  return result.shifts;
}

export async function createEmployerShift(draft: ShiftDraft): Promise<SharedShift> {
  const result = await request<{ shift: SharedShift }>("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      title: `${draft.service} · ${draft.client}`,
      serviceType: draft.service,
      caregiverType: draft.caregiverType,
      careRecipientName: draft.client,
      scheduleType: "one_time",
      startDate: draft.startDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: { type: "client_home", address: draft.address, city: draft.city, state: draft.state, zipCode: draft.zipCode },
      pay: { hourlyRate: draft.hourlyRate, currency: "USD" },
      numberOfCaregivers: 1,
      requirements: [],
      responsibilities: draft.responsibilities,
      contact: { name: draft.contactName, phone: draft.contactPhone },
      urgency: draft.urgency,
    }),
  });
  return result.shift;
}

export async function fetchEmployerApplications(): Promise<EmployerApplication[]> {
  const result = await request<{ applications: EmployerApplication[] }>("/api/bookings/employer/applications");
  return result.applications;
}

export async function updateEmployerApplication(applicationId: number, status: "approved" | "rejected") {
  return request<{ application: EmployerApplication }>(`/api/bookings/employer/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchEmployerCallouts(): Promise<EmployerCallout[]> {
  const result = await request<{ callouts: EmployerCallout[] }>("/api/bookings/employer/callouts");
  return result.callouts;
}

export async function launchCalloutRescue(calloutId: number) {
  return request<{ calloutId: number; offersSent: number; candidates: RescueCandidate[]; note: string }>(
    `/api/bookings/employer/callouts/${calloutId}/launch-rescue`,
    { method: "POST" },
  );
}
