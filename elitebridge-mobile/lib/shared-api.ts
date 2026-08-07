import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "elitebridge-caregiver-api-token-v1";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

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
  applicationStatus?: "pending" | "approved" | "rejected";
};

export type CaregiverApplication = {
  id: number;
  status: "pending" | "approved" | "rejected";
  note?: string;
  appliedAt: string;
  shift: CaregiverShift;
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

export async function ensureCaregiverBackendSession(email: string, password: string): Promise<boolean> {
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
        firstName: "Sarah",
        lastName: "Johnson",
        role: "caregiver",
        phone: "978-555-0190",
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
