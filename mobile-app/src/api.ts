import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const API_URL = extra?.apiUrl || "https://YOUR-BACKEND-URL.vercel.app/api";

async function request(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("eliteBridgeToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

export const api = {
  async register(payload: {
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
    phone?: string;
    password: string;
  }) {
    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...payload, role: "employer" }),
    });
    await AsyncStorage.setItem("eliteBridgeToken", data.token);
    await AsyncStorage.setItem("eliteBridgeUser", JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem("eliteBridgeToken", data.token);
    await AsyncStorage.setItem("eliteBridgeUser", JSON.stringify(data.user));
    return data;
  },

  async logout() {
    await AsyncStorage.multiRemove(["eliteBridgeToken", "eliteBridgeUser"]);
  },

  async getStoredUser() {
    const raw = await AsyncStorage.getItem("eliteBridgeUser");
    return raw ? JSON.parse(raw) : null;
  },

  async getMyShifts() {
    return request("/bookings/employer/my");
  },

  async createShift(payload: any) {
    return request("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
