import axios, { AxiosInstance } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle responses
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName: string;
    phone?: string;
  }) {
    const response = await this.client.post("/auth/register", {
      ...data,
      role: "employer",
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post("/auth/login", { email, password });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get("/auth/me");
    return response.data;
  }

  // Employer endpoints
  async getEmployerProfile(id: number) {
    const response = await this.client.get(`/employers/${id}`);
    return response.data;
  }

  async updateEmployerProfile(id: number, data: any) {
    const response = await this.client.put(`/employers/${id}`, data);
    return response.data;
  }

  // Shift/Job endpoints
  async createShift(data: any) {
    const response = await this.client.post("/bookings", data);
    return response.data;
  }

  async getMyShifts() {
    const response = await this.client.get("/bookings/employer/my");
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

  // Caregiver search
  async searchCaregivers(filters?: any) {
    const response = await this.client.get("/caregivers", { params: filters });
    return response.data;
  }

  async getCaregiverProfile(caregiverId: number) {
    const response = await this.client.get(`/caregivers/${caregiverId}`);
    return response.data;
  }

  // Booking management
  async getBookings() {
    const response = await this.client.get("/bookings/employer");
    return response.data;
  }

  async acceptCaregiverApplication(bookingId: number) {
    const response = await this.client.put(`/bookings/${bookingId}/accept-caregiver`);
    return response.data;
  }

  async rejectCaregiverApplication(bookingId: number, reason: string) {
    const response = await this.client.put(`/bookings/${bookingId}/reject-caregiver`, {
      reason,
    });
    return response.data;
  }

  // Messaging
  async getMessages(conversationId: number) {
    const response = await this.client.get(`/messages/${conversationId}`);
    return response.data;
  }

  async sendMessage(recipientId: number, content: string) {
    const response = await this.client.post("/messages", {
      recipientId,
      content,
    });
    return response.data;
  }

  // Billing
  async getBillingInfo() {
    const response = await this.client.get("/payments/billing");
    return response.data;
  }

  async getInvoices() {
    const response = await this.client.get("/payments/invoices");
    return response.data;
  }

  // Team management
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
