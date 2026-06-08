import { getDb } from "./db";
import { shiftAllocations, type InsertShiftAllocation } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Shift Allocation Service (Deputy-style)
 * Allows admins to directly assign shifts to caregivers
 */

export interface AllocateShiftRequest {
  shiftId: number;
  caregiverId: number;
  allocatedBy: number; // admin user id
  message?: string;
}

export interface RespondToAllocationRequest {
  allocationId: number;
  status: "accepted" | "declined";
}

/**
 * Allocate a shift to a caregiver (admin action)
 */
export async function allocateShift(request: AllocateShiftRequest) {
  try {
    const db = await getDb();

    // Check if already allocated
    const existing = await db
      .select()
      .from(shiftAllocations)
      .where(
        and(
          eq(shiftAllocations.shiftId, request.shiftId),
          eq(shiftAllocations.caregiverId, request.caregiverId),
          eq(shiftAllocations.status, "allocated")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: "Shift already allocated to this caregiver",
      };
    }

    const newAllocation: InsertShiftAllocation = {
      shiftId: request.shiftId,
      caregiverId: request.caregiverId,
      allocatedBy: request.allocatedBy,
      allocationMessage: request.message,
      status: "allocated",
      startTime: new Date(),
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours later
    };

    const result = await db.insert(shiftAllocations).values(newAllocation);

    return {
      success: true,
      allocationId: result.insertId,
      message: "Shift allocated successfully",
    };
  } catch (error: any) {
    console.error("Allocate shift error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Caregiver responds to allocation (accept or decline)
 */
export async function respondToAllocation(request: RespondToAllocationRequest) {
  try {
    const db = await getDb();

    // Get the allocation
    const allocation = await db
      .select()
      .from(shiftAllocations)
      .where(eq(shiftAllocations.id, request.allocationId))
      .limit(1);

    if (allocation.length === 0) {
      return {
        success: false,
        error: "Allocation not found",
      };
    }

    // Update the allocation
    await db
      .update(shiftAllocations)
      .set({
        status: request.status,
        respondedAt: new Date(),
      })
      .where(eq(shiftAllocations.id, request.allocationId));

    return {
      success: true,
      message: `Allocation ${request.status}`,
    };
  } catch (error: any) {
    console.error("Respond to allocation error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get allocations for a caregiver
 */
export async function getCaregiverAllocations(caregiverId: number) {
  try {
    const db = await getDb();

    const allocations = await db
      .select()
      .from(shiftAllocations)
      .where(eq(shiftAllocations.caregiverId, caregiverId));

    return {
      success: true,
      data: allocations,
    };
  } catch (error: any) {
    console.error("Get caregiver allocations error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get allocations for a shift
 */
export async function getShiftAllocations(shiftId: number) {
  try {
    const db = await getDb();

    const allocations = await db
      .select()
      .from(shiftAllocations)
      .where(eq(shiftAllocations.shiftId, shiftId));

    return {
      success: true,
      data: allocations,
    };
  } catch (error: any) {
    console.error("Get shift allocations error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get pending allocations for a caregiver
 */
export async function getPendingAllocations(caregiverId: number) {
  try {
    const db = await getDb();

    const allocations = await db
      .select()
      .from(shiftAllocations)
      .where(
        and(
          eq(shiftAllocations.caregiverId, caregiverId),
          eq(shiftAllocations.status, "allocated")
        )
      );

    return {
      success: true,
      data: allocations,
    };
  } catch (error: any) {
    console.error("Get pending allocations error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cancel an allocation
 */
export async function cancelAllocation(allocationId: number) {
  try {
    const db = await getDb();

    await db
      .update(shiftAllocations)
      .set({
        status: "cancelled",
      })
      .where(eq(shiftAllocations.id, allocationId));

    return {
      success: true,
      message: "Allocation cancelled",
    };
  } catch (error: any) {
    console.error("Cancel allocation error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
