import * as db from "./db";
import { InsertNotification } from "../drizzle/schema";

/**
 * Notification Service
 * Handles creation and delivery of notifications for Elite Bridge platform
 */

export interface NotificationPayload {
  type: "shift_posted" | "application_status" | "message" | "payment" | "background_check";
  title: string;
  message: string;
  data?: any;
}

/**
 * Send notification to a user
 */
export async function sendNotification(
  userId: number,
  payload: NotificationPayload
): Promise<number> {
  const notification: InsertNotification = {
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    data: payload.data,
    isRead: false,
  };

  return db.createNotification(notification);
}

/**
 * Notify user of a new shift posted
 */
export async function notifyShiftPosted(
  userId: number,
  shiftId: number
): Promise<number> {
  const shift = await db.getShiftById(shiftId);
  if (!shift) throw new Error("Shift not found");

  return sendNotification(userId, {
    type: "shift_posted",
    title: `New Shift Available: ${shift.title}`,
    message: `A new shift is available on ${new Date(shift.startTime).toLocaleDateString()}. Tap to view details.`,
    data: { shiftId },
  });
}

/**
 * Notify user of application status change
 */
export async function notifyApplicationStatus(
  userId: number,
  applicationId: number,
  status: string
): Promise<number> {
  return sendNotification(userId, {
    type: "application_status",
    title: `Application ${status}`,
    message: `Your application has been ${status}. Check your applications for details.`,
    data: { applicationId, status },
  });
}

/**
 * Notify user of a new message
 */
export async function notifyNewMessage(
  userId: number,
  senderName: string
): Promise<number> {
  return sendNotification(userId, {
    type: "message",
    title: `New Message from ${senderName}`,
    message: `You have a new message. Tap to view.`,
    data: { senderName },
  });
}

/**
 * Notify user of payment
 */
export async function notifyPayment(
  userId: number,
  amount: number
): Promise<number> {
  return sendNotification(userId, {
    type: "payment",
    title: `Payment Processed`,
    message: `A payment of $${amount.toFixed(2)} has been processed to your account.`,
    data: { amount },
  });
}

/**
 * Notify user of background check status
 */
export async function notifyBackgroundCheck(
  userId: number,
  status: string
): Promise<number> {
  return sendNotification(userId, {
    type: "background_check",
    title: `Background Check ${status}`,
    message: `Your background check has been ${status}. Check your profile for details.`,
    data: { status },
  });
}

/**
 * Broadcast notification to multiple users
 */
export async function broadcastNotification(
  userIds: number[],
  payload: NotificationPayload
): Promise<number[]> {
  const notificationIds: number[] = [];

  for (const userId of userIds) {
    try {
      const notificationId = await sendNotification(userId, payload);
      notificationIds.push(notificationId);
    } catch (error) {
      console.error(
        `Failed to send notification to user ${userId}:`,
        error
      );
    }
  }

  return notificationIds;
}
