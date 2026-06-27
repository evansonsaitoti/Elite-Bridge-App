import axios, { AxiosInstance } from "axios";
import { localAuthClient } from "./localAuth";
import { localShiftClient } from "./localShifts";

const CONFIGURED_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const API_BASE_URL = CONFIGURED_API_URL || "http://localhost:3000/api";
const USE_LOCAL_AUTH = !CONFIGURED_API_URL || import.meta.env.VITE_AUTH_MODE === "local";

type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
};

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { "Content-Type": "application/json" },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async register(data: RegisterPayload) {
    if (USE_LOCAL_AUTH) return localAuthClient.register(data);
    const response = await this.client.post("/auth/register", { ...data, role: "employer" });
    return response.data;
  }

  async login(email: string, password: string) {
    if (USE_LOCAL_AUTH) return localAuthClient.login(email, password);
    const response = await this.client.post("/auth/login", { email, password });
    return response.data;
  }

  async getCurrentUser() {
    const token = localStorage.getItem("token");
    if (USE_LOCAL_AUTH || token?.startsWith("local-auth-")) return localAuthClient.getCurrentUser(token);
    const response = await this.client.get("/auth/me");
    return response.data;
  }

  logout() {
    localAuthClient.logout();
    localStorage.removeItem("token");
  }

  async getEmployerProfile(id: number) {
    const response = await this.client.get(`/employers/${id}`);
    return response.data;
  }

  async updateEmployerProfile(id: number, data: any) {
    if (USE_LOCAL_AUTH) return localAuthClient.updateEmployerProfile(data);
    const response = await this.client.put(`/employers/${id}`, data);
    return response.data;
  }

  async createShift(data: any) {
    if (USE_LOCAL_AUTH) return localShiftClient.createShift(data);
    const response = await this.client.post("/bookings", data);
    return response.data;
  }

  async getMyShifts() {
    if (USE_LOCAL_AUTH) return localShiftClient.getMyShifts();
    const response = await this.client.get("/bookings/employer/my");
    return response.data;
  }

  async closeShift(shiftId: number) {
    if (USE_LOCAL_AUTH) return localShiftClient.closeShift(shiftId);
    const response = await this.client.put(`/bookings/${shiftId}/close`);
    return response.data;
  }

  async updateShift(shiftId: number, data: any) {
    const response = await this.client.put(`/bookings/${shiftId}`, data);
    return response.data;
  }

  async deleteShift(shiftId: number) {
    const response = await this.client.delete(`/bookings/${shiftId}`);
    return response.data;
  }

  async searchCaregivers(filters?: any) {
    const response = await this.client.get("/caregivers", { params: filters });
    return response.data;
  }

  async getCaregiverProfile(caregiverId: number) {
    const response = await this.client.get(`/caregivers/${caregiverId}`);
    return response.data;
  }

  async getBookings() {
    const response = await this.client.get("/bookings/employer");
    return response.data;
  }

  async acceptCaregiverApplication(bookingId: number) {
    const response = await this.client.put(`/bookings/${bookingId}/accept-caregiver`);
    return response.data;
  }

  async rejectCaregiverApplication(bookingId: number, reason: string) {
    const response = await this.client.put(`/bookings/${bookingId}/reject-caregiver`, { reason });
    return response.data;
  }

  async getMessages(conversationId: number) {
    const response = await this.client.get(`/messages/${conversationId}`);
    return response.data;
  }

  async sendMessage(recipientId: number, content: string) {
    const response = await this.client.post("/messages", { recipientId, content });
    return response.data;
  }

  async getBillingInfo() {
    const response = await this.client.get("/payments/billing");
    return response.data;
  }

  async getInvoices() {
    const response = await this.client.get("/payments/invoices");
    return response.data;
  }

  async getTeamMembers() {
    const response = await this.client.get("/employers/team");
    return response.data;
  }

  async addTeamMember(email: string, role: string) {
    const response = await this.client.post("/employers/team", { email, role });
    return response.data;
  }

  async removeTeamMember(memberId: number) {
    const response = await this.client.delete(`/employers/team/${memberId}`);
    return response.data;
  }
}

export const apiClient = new APIClient();
