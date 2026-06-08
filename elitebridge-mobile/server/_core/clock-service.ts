import { getDb } from "./db";
import { clockRecords, type InsertClockRecord } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Clock In/Out Service
 * Manages caregiver work hour tracking
 */

export interface ClockInRequest {
  userId: number;
  shiftId: number;
  notes?: string;
}

export interface ClockOutRequest {
  clockRecordId: number;
  notes?: string;
}

/**
 * Clock in for a shift
 */
export async function clockIn(request: ClockInRequest) {
  try {
    const db = await getDb();

    // Check if already clocked in for this shift
    const existingRecord = await db
      .select()
      .from(clockRecords)
      .where(
        and(
          eq(clockRecords.userId, request.userId),
          eq(clockRecords.shiftId, request.shiftId),
          eq(clockRecords.status, "in_progress")
        )
      )
      .limit(1);

    if (existingRecord.length > 0) {
      return {
        success: false,
        error: "Already clocked in for this shift",
      };
    }

    const newRecord: InsertClockRecord = {
      userId: request.userId,
      shiftId: request.shiftId,
      clockInTime: new Date(),
      status: "in_progress",
      notes: request.notes,
    };

    const result = await db.insert(clockRecords).values(newRecord);

    return {
      success: true,
      recordId: result.insertId,
      message: "Successfully clocked in",
    };
  } catch (error: any) {
    console.error("Clock in error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Clock out from a shift
 */
export async function clockOut(request: ClockOutRequest) {
  try {
    const db = await getDb();

    // Get the clock record
    const record = await db
      .select()
      .from(clockRecords)
      .where(eq(clockRecords.id, request.clockRecordId))
      .limit(1);

    if (record.length === 0) {
      return {
        success: false,
        error: "Clock record not found",
      };
    }

    const clockRecord = record[0];

    // Calculate hours worked
    const clockOutTime = new Date();
    const clockInTime = new Date(clockRecord.clockInTime);
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    // Update the record
    await db
      .update(clockRecords)
      .set({
        clockOutTime,
        hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        status: "completed",
        notes: request.notes || clockRecord.notes,
      })
      .where(eq(clockRecords.id, request.clockRecordId));

    return {
      success: true,
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      message: "Successfully clocked out",
    };
  } catch (error: any) {
    console.error("Clock out error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get clock records for a user
 */
export async function getUserClockRecords(userId: number, shiftId?: number) {
  try {
    const db = await getDb();

    let query = db.select().from(clockRecords).where(eq(clockRecords.userId, userId));

    if (shiftId) {
      query = query.where(eq(clockRecords.shiftId, shiftId));
    }

    const records = await query;

    return {
      success: true,
      data: records,
    };
  } catch (error: any) {
    console.error("Get clock records error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get current active clock record for a user
 */
export async function getActiveClockRecord(userId: number) {
  try {
    const db = await getDb();

    const records = await db
      .select()
      .from(clockRecords)
      .where(
        and(eq(clockRecords.userId, userId), eq(clockRecords.status, "in_progress"))
      )
      .limit(1);

    if (records.length === 0) {
      return {
        success: true,
        data: null,
        message: "No active clock record",
      };
    }

    return {
      success: true,
      data: records[0],
    };
  } catch (error: any) {
    console.error("Get active clock record error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get total hours worked by a user
 */
export async function getTotalHoursWorked(userId: number) {
  try {
    const db = await getDb();

    const records = await db
      .select()
      .from(clockRecords)
      .where(
        and(eq(clockRecords.userId, userId), eq(clockRecords.status, "completed"))
      );

    const totalHours = records.reduce((sum: number, record: any) => {
      return sum + (record.hoursWorked ? parseFloat(record.hoursWorked.toString()) : 0);
    }, 0);

    return {
      success: true,
      totalHours: parseFloat(totalHours.toFixed(2)),
      recordCount: records.length,
    };
  } catch (error: any) {
    console.error("Get total hours error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
