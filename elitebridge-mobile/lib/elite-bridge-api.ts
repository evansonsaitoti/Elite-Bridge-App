import * as Auth from "@/lib/_core/auth";

const API_BASE = process.env.EXPO_PUBLIC_ELITE_BRIDGE_API_URL || "https://elite-bridge-shared-api-evans.vercel.app/api";

export type SharedUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "caregiver" | "employer";
  phone?: string | null;
};

export type SharedShift = {
  id: number;
  title: string;
  serviceType: string;
  caregiverType: string;
  careRecipientName?: string | null;
  startTime: string;
  endTime: string;
  location: { address: string; city: string; state: string; zipCode: string };
  hourlyRate: number;
  responsibilities: string;
  urgency: "standard" | "urgent";
  status: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await Auth.getSessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Elite Bridge request failed");
  return data as T;
}

export const eliteBridgeApi = {
  login(email: string, password: string) {
    return request<{ token: string; user: SharedUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  getEmployerShifts() {
    return request<{ shifts: SharedShift[] }>("/bookings/employer/my");
  },
  getAvailableShifts() {
    return request<{ shifts: SharedShift[] }>("/bookings/available");
  },
  createShift(payload: unknown) {
    return request<{ shift: SharedShift }>("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
