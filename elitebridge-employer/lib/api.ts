import AsyncStorage from "@react-native-async-storage/async-storage";

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "elite-bridge-employer-token-v2";
const USER_KEY = "elite-bridge-employer-user-v2";

export type EmployerUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "employer";
  companyName?: string;
};

export type Shift = {
  id: number;
  title: string;
  serviceType: string;
  caregiverType: string;
  careRecipientName?: string;
  startTime: string;
  endTime: string;
  location: { address: string; city: string; state: string; zipCode: string };
  hourlyRate: number;
  responsibilities: string;
  urgency: "standard" | "urgent";
  assignmentMode: "instant" | "review";
  status: string;
};

export type ShiftInput = {
  careRecipientName: string;
  serviceType: string;
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
  assignmentMode: "instant" | "review";
};

export type EmployerProfile = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  companyDescription: string;
  website: string;
  servicesOffered: string[];
  billingAddress: { address?: string; city?: string; state?: string; zipCode?: string };
  verificationStatus: string;
};

export type EmployerNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
};

export type Application = {
  id: number;
  status: "pending" | "approved" | "rejected";
  note?: string;
  created_at: string;
  shift_title: string;
  service_type: string;
  start_time: string;
  end_time: string;
  city: string;
  state: string;
  first_name: string;
  last_name: string;
  email: string;
  rating?: string | number;
  total_hours?: string | number;
  certifications?: string[];
};

export type TeamMember = {
  caregiver_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  rating?: string | number;
  total_hours?: string | number;
  certifications?: string[];
  assigned_shifts: number;
  upcoming_shifts: number;
  last_assigned_at?: string;
};

export type ShiftActivity = {
  id: number;
  shift_id: number;
  caregiver_id: number;
  type: "clock_in" | "clock_out" | string;
  timestamp: string;
  shift_title: string;
  first_name: string;
  last_name: string;
  notes?: string;
};

type ApiError = Error & { status?: number };

export const apiConfigured = Boolean(API_URL);

export async function warmEmployerService() {
  if (!API_URL) return;
  await fetch(`${API_URL}/health`).catch(() => undefined);
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  if (!API_URL) throw new Error("The secure Elite Bridge service is unavailable in this build.");
  const token = authenticated ? await AsyncStorage.getItem(TOKEN_KEY) : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || "The request could not be completed.") as ApiError;
    error.status = response.status;
    throw error;
  }
  return body as T;
}

function assertEmployer(user: { role: string }): asserts user is EmployerUser {
  if (user.role !== "employer") {
    throw new Error("This app is for employer accounts. Caregivers should use Elite Bridge Caregiver.");
  }
}

async function saveSession(token: string, user: EmployerUser) {
  await AsyncStorage.multiSet([[TOKEN_KEY, token], [USER_KEY, JSON.stringify(user)]]);
}

export async function registerEmployer(input: {
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<EmployerUser> {
  const { firstName, lastName, companyName, phone, email, password } = input;
  const result = await request<{ token: string; user: EmployerUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, companyName, phone, email: email.trim().toLowerCase(), password, role: "employer" }),
  }, false);
  assertEmployer(result.user);
  await saveSession(result.token, result.user);
  return result.user;
}

export async function signInEmployer(email: string, password: string): Promise<EmployerUser> {
  const result = await request<{ token: string; user: EmployerUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  }, false);
  assertEmployer(result.user);
  await saveSession(result.token, result.user);
  return result.user;
}

export async function getStoredEmployer(): Promise<EmployerUser | null> {
  const [token, rawUser] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ]);
  if (!token || !rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as EmployerUser;
    assertEmployer(user);
    return user;
  } catch {
    await signOutEmployer();
    return null;
  }
}

export async function signOutEmployer() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function registerEmployerDevice(token: string, platform: "ios" | "android") {
  await request<void>("/api/notifications/device", {
    method: "POST",
    body: JSON.stringify({ token, platform, app: "employer" }),
  });
}

export async function removeEmployerDevice(token: string) {
  await request<void>("/api/notifications/device", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });
}

export async function deleteEmployerAccount() {
  await request<void>("/api/auth/account", { method: "DELETE" });
  await signOutEmployer();
}

export async function getEmployerShifts(): Promise<Shift[]> {
  const result = await request<{ shifts: Shift[] }>("/api/bookings/employer/my");
  return result.shifts;
}

export async function createEmployerShift(input: ShiftInput): Promise<{ shift: Shift; matchedCaregivers: number }> {
  return request<{ shift: Shift; matchedCaregivers: number }>("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      title: `${input.serviceType} · ${input.careRecipientName}`,
      serviceType: input.serviceType,
      caregiverType: input.caregiverType,
      careRecipientName: input.careRecipientName,
      scheduleType: "one_time",
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      location: {
        type: "client_home",
        address: input.address,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
      },
      pay: { hourlyRate: input.hourlyRate, currency: "USD" },
      numberOfCaregivers: 1,
      requirements: [],
      responsibilities: input.responsibilities,
      contact: { name: input.contactName, phone: input.contactPhone },
      urgency: input.urgency,
      assignmentMode: input.assignmentMode,
    }),
  });
}

export async function getEmployerApplications(): Promise<Application[]> {
  const result = await request<{ applications: Application[] }>("/api/bookings/employer/applications");
  return result.applications;
}

export async function getEmployerTeam(): Promise<TeamMember[]> {
  const result = await request<{ team: TeamMember[] }>("/api/bookings/employer/team");
  return result.team;
}

export async function getEmployerActivities(): Promise<ShiftActivity[]> {
  const result = await request<{ activities: ShiftActivity[] }>("/api/bookings/activities");
  return result.activities;
}

export async function updateApplication(id: number, status: "approved" | "rejected") {
  await request(`/api/bookings/employer/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function cancelEmployerShift(id: number) {
  await request<void>(`/api/bookings/employer/${id}/cancel`, { method: "PATCH" });
}

export async function getEmployerProfile(): Promise<EmployerProfile> {
  const result = await request<{ profile: EmployerProfile }>("/api/employers/me");
  return result.profile;
}

export async function updateEmployerProfile(input: Partial<EmployerProfile>): Promise<EmployerProfile> {
  const result = await request<{ profile: EmployerProfile }>("/api/employers/me", {
    method: "PUT",
    body: JSON.stringify({
      firstName: input.firstName,
      lastName: input.lastName,
      companyName: input.companyName,
      phone: input.phone,
      companyDescription: input.companyDescription,
      website: input.website,
      servicesOffered: input.servicesOffered,
      address: input.billingAddress?.address,
      city: input.billingAddress?.city,
      state: input.billingAddress?.state,
      zipCode: input.billingAddress?.zipCode,
    }),
  });
  const user: EmployerUser = { id: result.profile.userId, email: result.profile.email, firstName: result.profile.firstName, lastName: result.profile.lastName, role: "employer", companyName: result.profile.companyName };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return result.profile;
}

export async function getEmployerNotifications(): Promise<EmployerNotification[]> {
  const result = await request<{ notifications: EmployerNotification[] }>("/api/notifications");
  return result.notifications;
}

export async function markEmployerNotificationRead(id: number) {
  await request<void>(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllEmployerNotificationsRead() {
  await request<void>("/api/notifications/read-all", { method: "POST" });
}
