import AsyncStorage from "@react-native-async-storage/async-storage";

export type EmployerSession = {
  email: string;
  name: string;
  role: "owner" | "administrator" | "scheduler";
};

export type AgencyProfile = {
  agencyName: string;
  agencyType: "Home Care Agency" | "Staffing Agency" | "Home Health Agency" | "Other";
  city: string;
  state: string;
  employeeCount: string;
  medicaidPrograms: boolean;
  evvRequired: boolean;
  logoUri?: string;
  contactName?: string;
  phone?: string;
  payrollProvider?: "Gusto" | "ADP" | "QuickBooks" | "";
};

const SESSION_KEY = "elitebridge-employer-session-v1";
const AGENCY_KEY = "elitebridge-employer-agency-v1";
const COMPLIANCE_KEY = "elitebridge-employer-compliance-v1";
const LOCAL_SHIFTS_KEY = "elitebridge-employer-local-shifts-v1";

export type EmployerScheduleShift = {
  id: string;
  client: string;
  service: string;
  time: string;
  location: string;
  status: "Covered" | "Open" | "At risk";
  caregiver?: string;
  hourlyRate?: number;
  createdAt: string;
};

export const DEMO_EMPLOYER = {
  email: "employer@elitebridge.com",
  password: "Employer123!",
  name: "Agency Administrator",
} as const;

export async function getEmployerSession(): Promise<EmployerSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EmployerSession;
  } catch {
    return null;
  }
}

export async function saveEmployerSession(session: EmployerSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearEmployerSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getAgencyProfile(): Promise<AgencyProfile | null> {
  const raw = await AsyncStorage.getItem(AGENCY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgencyProfile;
  } catch {
    return null;
  }
}

export async function saveAgencyProfile(profile: AgencyProfile): Promise<void> {
  await AsyncStorage.setItem(AGENCY_KEY, JSON.stringify(profile));
}

export async function getComplianceState(): Promise<Record<string, "open" | "reviewing" | "resolved">> {
  const raw = await AsyncStorage.getItem(COMPLIANCE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, "open" | "reviewing" | "resolved">;
  } catch {
    return {};
  }
}

export async function saveComplianceState(state: Record<string, "open" | "reviewing" | "resolved">): Promise<void> {
  await AsyncStorage.setItem(COMPLIANCE_KEY, JSON.stringify(state));
}

export async function getLocalScheduleShifts(): Promise<EmployerScheduleShift[]> {
  const raw = await AsyncStorage.getItem(LOCAL_SHIFTS_KEY);
  if (!raw) return [];
  try {
    const shifts = JSON.parse(raw) as EmployerScheduleShift[];
    return Array.isArray(shifts) ? shifts : [];
  } catch {
    return [];
  }
}

export async function saveLocalScheduleShift(shift: EmployerScheduleShift): Promise<EmployerScheduleShift[]> {
  const current = await getLocalScheduleShifts();
  const next = [shift, ...current.filter((item) => item.id !== shift.id)];
  await AsyncStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(next));
  return next;
}
