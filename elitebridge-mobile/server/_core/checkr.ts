import axios from "axios";
import { ENV } from "./env";

/**
 * Checkr API Integration Service
 * Handles background check requests and status tracking
 */

const CHECKR_API_BASE = "https://api.checkr.com/v1";
const CHECKR_API_KEY = process.env.CHECKR_API_KEY || "";

const checkrClient = axios.create({
  baseURL: CHECKR_API_BASE,
  auth: {
    username: CHECKR_API_KEY,
    password: "",
  },
  headers: {
    "Content-Type": "application/json",
  },
});

export interface CheckrCandidate {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  ssn?: string;
  driversLicenseNumber?: string;
  driversLicenseState?: string;
}

export interface CheckrInvitation {
  id: string;
  candidateId: string;
  status: "pending" | "completed" | "expired";
  createdAt: string;
  completedAt?: string;
}

export interface CheckrReport {
  id: string;
  candidateId: string;
  status: "pending" | "clear" | "consider" | "suspended" | "canceled";
  createdAt: string;
  completedAt?: string;
  adjudication?: string;
  package?: string;
}

/**
 * Create a candidate in Checkr
 */
export async function createCheckrCandidate(candidate: CheckrCandidate) {
  try {
    const response = await checkrClient.post("/candidates", {
      first_name: candidate.firstName,
      last_name: candidate.lastName,
      email: candidate.email,
      phone_number: candidate.phoneNumber,
      date_of_birth: candidate.dateOfBirth,
      ssn: candidate.ssn,
      drivers_license_number: candidate.driversLicenseNumber,
      drivers_license_state: candidate.driversLicenseState,
    });

    return {
      success: true,
      candidateId: response.data.id,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Checkr create candidate error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Invite a candidate to complete background check
 */
export async function inviteCheckrCandidate(candidateId: string, packageName: string = "basic") {
  try {
    const response = await checkrClient.post("/invitations", {
      candidate_id: candidateId,
      package: packageName,
    });

    return {
      success: true,
      invitationId: response.data.id,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Checkr invite candidate error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Get candidate information
 */
export async function getCheckrCandidate(candidateId: string) {
  try {
    const response = await checkrClient.get(`/candidates/${candidateId}`);

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Checkr get candidate error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Get background check report
 */
export async function getCheckrReport(reportId: string) {
  try {
    const response = await checkrClient.get(`/reports/${reportId}`);

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Checkr get report error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * List reports for a candidate
 */
export async function listCheckrReports(candidateId: string) {
  try {
    const response = await checkrClient.get("/reports", {
      params: {
        candidate_id: candidateId,
      },
    });

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error: any) {
    console.error("Checkr list reports error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Get background check status
 */
export async function getBackgroundCheckStatus(candidateId: string) {
  try {
    const reportsResponse = await listCheckrReports(candidateId);

    if (!reportsResponse.success || !reportsResponse.data || reportsResponse.data.length === 0) {
      return {
        success: true,
        status: "pending",
        message: "No background check initiated yet",
      };
    }

    const latestReport = reportsResponse.data[0];

    return {
      success: true,
      status: latestReport.status,
      reportId: latestReport.id,
      createdAt: latestReport.created_at,
      completedAt: latestReport.completed_at,
      adjudication: latestReport.adjudication,
      data: latestReport,
    };
  } catch (error: any) {
    console.error("Checkr get status error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
