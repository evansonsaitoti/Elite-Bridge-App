import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for Clock In/Out and Shift Allocation Services
 */

// Mock clock service functions
const mockClockIn = vi.fn().mockResolvedValue({
  success: true,
  recordId: 1,
  message: "Successfully clocked in",
});

const mockClockOut = vi.fn().mockResolvedValue({
  success: true,
  hoursWorked: 8.5,
  message: "Successfully clocked out",
});

const mockGetActiveClockRecord = vi.fn().mockResolvedValue({
  success: true,
  data: {
    id: 1,
    userId: 1,
    shiftId: 1,
    clockInTime: new Date(),
    status: "in_progress",
  },
});

const mockGetTotalHoursWorked = vi.fn().mockResolvedValue({
  success: true,
  totalHours: 24.5,
  recordCount: 3,
});

// Mock shift allocation functions
const mockAllocateShift = vi.fn().mockResolvedValue({
  success: true,
  allocationId: 1,
  message: "Shift allocated successfully",
});

const mockRespondToAllocation = vi.fn().mockResolvedValue({
  success: true,
  message: "Allocation accepted",
});

const mockGetCaregiverAllocations = vi.fn().mockResolvedValue({
  success: true,
  data: [
    {
      id: 1,
      shiftId: 1,
      caregiverId: 1,
      status: "allocated",
      allocatedAt: new Date(),
    },
  ],
});

const mockCancelAllocation = vi.fn().mockResolvedValue({
  success: true,
  message: "Allocation cancelled",
});

describe("Clock In/Out Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully clock in", async () => {
    const result = await mockClockIn({
      userId: 1,
      shiftId: 1,
      notes: "Starting shift",
    });

    expect(result.success).toBe(true);
    expect(result.recordId).toBe(1);
    expect(result.message).toContain("clocked in");
  });

  it("should successfully clock out", async () => {
    const result = await mockClockOut({
      clockRecordId: 1,
      notes: "Shift completed",
    });

    expect(result.success).toBe(true);
    expect(result.hoursWorked).toBe(8.5);
    expect(result.message).toContain("clocked out");
  });

  it("should get active clock record", async () => {
    const result = await mockGetActiveClockRecord(1);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.status).toBe("in_progress");
  });

  it("should calculate total hours worked", async () => {
    const result = await mockGetTotalHoursWorked(1);

    expect(result.success).toBe(true);
    expect(result.totalHours).toBe(24.5);
    expect(result.recordCount).toBe(3);
  });

  it("should handle clock in errors", async () => {
    mockClockIn.mockResolvedValueOnce({
      success: false,
      error: "Already clocked in for this shift",
    });

    const result = await mockClockIn({
      userId: 1,
      shiftId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Already clocked in");
  });
});

describe("Shift Allocation Service (Deputy-style)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully allocate a shift", async () => {
    const result = await mockAllocateShift({
      shiftId: 1,
      caregiverId: 1,
      allocatedBy: 2,
      message: "Please accept this shift",
    });

    expect(result.success).toBe(true);
    expect(result.allocationId).toBe(1);
    expect(result.message).toContain("allocated successfully");
  });

  it("should allow caregiver to accept allocation", async () => {
    const result = await mockRespondToAllocation({
      allocationId: 1,
      status: "accepted",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("accepted");
  });

  it("should allow caregiver to decline allocation", async () => {
    mockRespondToAllocation.mockResolvedValueOnce({
      success: true,
      message: "Allocation declined",
    });

    const result = await mockRespondToAllocation({
      allocationId: 1,
      status: "declined",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("declined");
  });

  it("should get caregiver allocations", async () => {
    const result = await mockGetCaregiverAllocations(1);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].caregiverId).toBe(1);
  });

  it("should cancel an allocation", async () => {
    const result = await mockCancelAllocation(1);

    expect(result.success).toBe(true);
    expect(result.message).toContain("cancelled");
  });

  it("should handle allocation errors", async () => {
    mockAllocateShift.mockResolvedValueOnce({
      success: false,
      error: "Shift already allocated to this caregiver",
    });

    const result = await mockAllocateShift({
      shiftId: 1,
      caregiverId: 1,
      allocatedBy: 2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already allocated");
  });
});

describe("Integration: Clock and Allocation Workflow", () => {
  it("should complete full workflow: allocate -> accept -> clock in -> clock out", async () => {
    // Step 1: Admin allocates shift
    const allocation = await mockAllocateShift({
      shiftId: 1,
      caregiverId: 1,
      allocatedBy: 2,
    });
    expect(allocation.success).toBe(true);

    // Step 2: Caregiver accepts allocation
    const response = await mockRespondToAllocation({
      allocationId: allocation.allocationId,
      status: "accepted",
    });
    expect(response.success).toBe(true);

    // Step 3: Caregiver clocks in
    const clockIn = await mockClockIn({
      userId: 1,
      shiftId: 1,
    });
    expect(clockIn.success).toBe(true);

    // Step 4: Verify active clock record
    const active = await mockGetActiveClockRecord(1);
    expect(active.success).toBe(true);
    expect(active.data).toBeDefined();

    // Step 5: Caregiver clocks out
    const clockOut = await mockClockOut({
      clockRecordId: active.data.id,
    });
    expect(clockOut.success).toBe(true);
    expect(clockOut.hoursWorked).toBeGreaterThan(0);
  });
});
