import AsyncStorage from "@react-native-async-storage/async-storage";

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const TOKEN_KEY = "elitebridge-employer-api-token-v1";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

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

export type AskEliteResponse = {
  intent: string;
  answer: string;
  evidence: string[];
  actionLabel?: string;
  route?: "/coverage" | "/compliance" | "/schedule" | "/applications" | "/operations";
  confirmation?: string;
  generatedAt: string;
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
  return request<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
}

export async function ensureEmployerBackendSession(email: string, password: string): Promise<boolean> {
  if (!API_BASE_URL) return false;
  const existing = await AsyncStorage.getItem(TOKEN_KEY);
  if (existing) return true;

  try {
    const result = await login(email, password);
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    return true;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status !== 401) throw error;
  }

  try {
    const registration = await request<{ token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        firstName: "Agency",
        lastName: "Administrator",
        role: "employer",
        companyName: "Elite Bridge Review Agency",
        phone: "978-555-0100",
      }),
    }, false);
    await AsyncStorage.setItem(TOKEN_KEY, registration.token);
    return true;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status !== 409) throw error;
    const result = await login(email, password);
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    return true;
  }
}

export async function clearEmployerBackendSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
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

export async function askElite(command: string): Promise<AskEliteResponse> {
  return request<AskEliteResponse>("/api/ai/ask", {
    method: "POST",
    body: JSON.stringify({ command }),
  });
}
