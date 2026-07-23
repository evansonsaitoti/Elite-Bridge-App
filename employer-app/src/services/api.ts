import axios, { AxiosInstance } from "axios";

const API_BASE_URL = "http://34.75.156.104:3000/api";
const USE_LOCAL_AUTH = false;

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
    const response = await this.client.post("/auth/register", { ...data, role: "employer" });
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

  logout() {
    localStorage.removeItem("token");
  }

  async getEmployerProfile(id: number) {
    const response = await this.client.get(`/employers/${id}`);
    return response.data;
  }

  async updateEmployerProfile(id: number, data: any) {
    const response = await this.client.put(`/employers/${id}`, data);
    return response.data;
  }

  async createShift(data: any) {
    const response = await this.client.post("/bookings", data);
    return response.data;
  }

  async getMyShifts() {
    const response = await this.client.get("/bookings/employer/my");
    return response.data;
  }

  async closeShift(shiftId: number) {
    const response = await this.client.put(`/bookings/${shiftId}/close`);
    return response.data;
  }

  async getActivities() {
    const response = await this.client.get('/bookings/activities');
    return response.data;
  }

  async getCaregivers() {
    const response = await this.client.get('/caregivers');
    return response.data;
  }

  async getConversations() {
    const response = await this.client.get('/messages/conversations');
    return response.data;
  }

  async getMessages(contactId: number) {
    const response = await this.client.get(`/messages/${contactId}`);
    return response.data;
  }

  async sendMessage(recipientId: number, content: string) {
    const response = await this.client.post("/messages", { recipientId, content });
    return response.data;
  }

  async getPayrollOverview() {
    const response = await this.client.get("/payroll/employer/overview");
    return response.data;
  }

  async generateInvoice(bookingId: number) {
    const response = await this.client.post("/payroll/generate-invoice", { bookingId });
    return response.data;
  }

  async processPayment(paymentId: number) {
    const response = await this.client.post(`/payroll/${paymentId}/process`);
    return response.data;
  }
}

export const apiClient = new APIClient();
export default APIClient;
