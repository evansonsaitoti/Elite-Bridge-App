import { describe, it, expect } from "vitest";
import { mockData } from "../server/mock-data";

describe("Mock Data Service", () => {
  describe("Locations", () => {
    it("should have 5 sample locations in Massachusetts", () => {
      expect(mockData.locations).toHaveLength(5);
    });

    it("should have valid location properties", () => {
      mockData.locations.forEach((location) => {
        expect(location.name).toBeDefined();
        expect(location.address).toBeDefined();
        expect(location.city).toBeDefined();
        expect(location.state).toBe("MA");
        expect(location.zipCode).toBeDefined();
      });
    });
  });

  describe("Staff Members", () => {
    it("should have 6 sample staff members", () => {
      expect(mockData.staffMembers).toHaveLength(6);
    });

    it("should all have role 'user'", () => {
      mockData.staffMembers.forEach((staff) => {
        expect(staff.role).toBe("user");
      });
    });

    it("should have valid email addresses", () => {
      mockData.staffMembers.forEach((staff) => {
        expect(staff.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe("Admins", () => {
    it("should have 2 sample admins", () => {
      expect(mockData.admins).toHaveLength(2);
    });

    it("should all have role 'admin'", () => {
      mockData.admins.forEach((admin) => {
        expect(admin.role).toBe("admin");
      });
    });
  });

  describe("Shifts", () => {
    it("should have 6 sample shifts", () => {
      expect(mockData.shifts).toHaveLength(6);
    });

    it("should have valid service types", () => {
      const validTypes = ["companion", "personal_care", "household", "mobility_assistance"];
      mockData.shifts.forEach((shift) => {
        expect(validTypes).toContain(shift.serviceType);
      });
    });

    it("should have positive hourly rates", () => {
      mockData.shifts.forEach((shift) => {
        expect(shift.hourlyRate).toBeGreaterThan(0);
      });
    });

    it("should have end time after start time", () => {
      mockData.shifts.forEach((shift) => {
        expect(shift.endTime.getTime()).toBeGreaterThan(shift.startTime.getTime());
      });
    });
  });

  describe("Caregiver Profiles", () => {
    it("should have 6 sample caregiver profiles", () => {
      expect(mockData.caregiverProfiles).toHaveLength(6);
    });

    it("should have valid background check statuses", () => {
      const validStatuses = ["pending", "approved", "rejected"];
      mockData.caregiverProfiles.forEach((profile) => {
        expect(validStatuses).toContain(profile.backgroundCheckStatus);
      });
    });

    it("should have ratings between 0 and 5", () => {
      mockData.caregiverProfiles.forEach((profile) => {
        expect(profile.averageRating).toBeGreaterThanOrEqual(0);
        expect(profile.averageRating).toBeLessThanOrEqual(5);
      });
    });
  });

  describe("Applications", () => {
    it("should have 6 sample applications", () => {
      expect(mockData.applications).toHaveLength(6);
    });

    it("should have valid application statuses", () => {
      const validStatuses = ["pending", "approved", "rejected", "accepted"];
      mockData.applications.forEach((app) => {
        expect(validStatuses).toContain(app.status);
      });
    });

    it("should have valid shift and user indices", () => {
      mockData.applications.forEach((app) => {
        expect(app.shiftIndex).toBeGreaterThanOrEqual(0);
        expect(app.shiftIndex).toBeLessThan(mockData.shifts.length);
        expect(app.userIndex).toBeGreaterThanOrEqual(0);
        expect(app.userIndex).toBeLessThan(mockData.staffMembers.length);
      });
    });

    it("should have rejection reason only for rejected applications", () => {
      mockData.applications.forEach((app) => {
        if (app.status === "rejected") {
          expect(app.rejectionReason).toBeDefined();
        }
      });
    });
  });

  describe("Ratings", () => {
    it("should have 5 sample ratings", () => {
      expect(mockData.ratings).toHaveLength(5);
    });

    it("should have ratings between 1 and 5", () => {
      mockData.ratings.forEach((rating) => {
        expect(rating.rating).toBeGreaterThanOrEqual(1);
        expect(rating.rating).toBeLessThanOrEqual(5);
      });
    });

    it("should have valid caregiver and client indices", () => {
      mockData.ratings.forEach((rating) => {
        expect(rating.caregiverIndex).toBeGreaterThanOrEqual(0);
        expect(rating.caregiverIndex).toBeLessThan(mockData.caregiverProfiles.length);
        expect(rating.clientIndex).toBeGreaterThanOrEqual(0);
        expect(rating.clientIndex).toBeLessThan(mockData.staffMembers.length);
      });
    });
  });
});
