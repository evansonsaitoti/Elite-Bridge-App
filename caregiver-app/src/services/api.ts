import axios, { AxiosInstance } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://34.75.156.104:3000/api";

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
    phone?: string;
  }) {
    const response = await this.client.post("/auth/register", {
      ...data,
      role: "caregiver",
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

  // Caregiver endpoints
  async getCaregiverProfile(id: number) {
    const response = await this.client.get(`/caregivers/${id}`);
    return response.data;
  }

  async updateCaregiverProfile(id: number, data: any) {
    const response = await this.client.put(`/caregivers/${id}`, data);
    return response.data;
  }

  async getAvailableShifts(filters?: any) {
    const response = await this.client.get("/bookings", { params: filters });
    return response.data;
  }

  async getMyBookings() {
    const response = await this.client.get("/bookings/my");
    return response.data;
  }

  async acceptBooking(bookingId: number) {
    const response = await this.client.put(`/bookings/${bookingId}/accept`);
    return response.data;
  }

  async rejectBooking(bookingId: number, reason: string) {
    const response = await this.client.put(`/bookings/${bookingId}/reject`, { reason });
    return response.data;
  }

  async clockIn(bookingId: number) {
    const response = await this.client.post(`/bookings/${bookingId}/clock-in`);
    return response.data;
  }

  async clockOut(bookingId: number) {
    const response = await this.client.post(`/bookings/${bookingId}/clock-out`);
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

  // Earnings
  async getEarnings() {
    const response = await this.client.get("/caregivers/earnings");
    return response.data;
  }

  async getPaymentHistory() {
    const response = await this.client.get("/payments/history");
    return response.data;
  }

  // Reviews
  async getReviews() {
    const response = await this.client.get("/reviews");
    return response.data;
  }
}

export const apiClient = new APIClient();
