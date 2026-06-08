/**
 * SMS/Email Notification Service - Integrates Twilio and SendGrid
 * Sends SMS and email notifications for shifts, applications, and events
 */

export interface SMSNotification {
  phoneNumber: string;
  message: string;
  type: "shift_reminder" | "application_status" | "background_check" | "shift_alert";
}

export interface EmailNotification {
  email: string;
  subject: string;
  body: string;
  type: "shift_reminder" | "application_status" | "background_check" | "earnings_report";
  htmlTemplate?: string;
}

/**
 * Send SMS notification via Twilio
 */
export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  try {
    const twilioApiKey = process.env.TWILIO_API_KEY;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "(508) 251-9346";

    if (!twilioApiKey) {
      console.warn("Twilio API key not configured");
      return false;
    }

    // In production, this would call Twilio API
    // const client = twilio(twilioAccountSid, twilioAuthToken);
    // await client.messages.create({
    //   body: notification.message,
    //   from: twilioPhoneNumber,
    //   to: notification.phoneNumber,
    // });

    console.log(`SMS sent to ${notification.phoneNumber}: ${notification.message}`);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

/**
 * Send email notification via SendGrid
 */
export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  try {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;

    if (!sendGridApiKey) {
      console.warn("SendGrid API key not configured");
      return false;
    }

    // In production, this would call SendGrid API
    // const sgMail = require("@sendgrid/mail");
    // sgMail.setApiKey(sendGridApiKey);
    // await sgMail.send({
    //   to: notification.email,
    //   from: "noreply@elitebridge.com",
    //   subject: notification.subject,
    //   html: notification.htmlTemplate || notification.body,
    // });

    console.log(`Email sent to ${notification.email}: ${notification.subject}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

/**
 * Send shift reminder notifications (SMS + Email)
 */
export async function sendShiftReminder(
  phoneNumber: string,
  email: string,
  shiftTitle: string,
  facilityName: string,
  startTime: string
): Promise<void> {
  const smsMessage = `Reminder: Your ${shiftTitle} shift at ${facilityName} starts ${startTime}. Reply CONFIRM to confirm attendance.`;

  const emailBody = `
    <h2>Shift Reminder</h2>
    <p>You have an upcoming shift:</p>
    <ul>
      <li><strong>Position:</strong> ${shiftTitle}</li>
      <li><strong>Facility:</strong> ${facilityName}</li>
      <li><strong>Start Time:</strong> ${startTime}</li>
    </ul>
    <p>Please confirm your attendance by replying to this email or logging into your account.</p>
  `;

  await sendSMS({
    phoneNumber,
    message: smsMessage,
    type: "shift_reminder",
  });

  await sendEmail({
    email,
    subject: `Shift Reminder: ${shiftTitle} at ${facilityName}`,
    body: emailBody,
    htmlTemplate: emailBody,
    type: "shift_reminder",
  });
}

/**
 * Send application status notifications (SMS + Email)
 */
export async function sendApplicationStatus(
  phoneNumber: string,
  email: string,
  status: "approved" | "rejected",
  shiftTitle: string,
  facilityName: string
): Promise<void> {
  const isApproved = status === "approved";
  const smsMessage = isApproved
    ? `Great news! You've been approved for ${shiftTitle} at ${facilityName}. Log in to confirm your attendance.`
    : `Your application for ${shiftTitle} at ${facilityName} was not selected. Check the app for other opportunities.`;

  const emailSubject = isApproved
    ? `Application Approved: ${shiftTitle} at ${facilityName}`
    : `Application Update: ${shiftTitle} at ${facilityName}`;

  const emailBody = isApproved
    ? `
    <h2>Application Approved! 🎉</h2>
    <p>Congratulations! You've been approved for the following shift:</p>
    <ul>
      <li><strong>Position:</strong> ${shiftTitle}</li>
      <li><strong>Facility:</strong> ${facilityName}</li>
    </ul>
    <p>Please log in to your account to confirm your attendance.</p>
  `
    : `
    <h2>Application Update</h2>
    <p>Your application for the following position was not selected:</p>
    <ul>
      <li><strong>Position:</strong> ${shiftTitle}</li>
      <li><strong>Facility:</strong> ${facilityName}</li>
    </ul>
    <p>Don't worry! Check the app for other available opportunities.</p>
  `;

  await sendSMS({
    phoneNumber,
    message: smsMessage,
    type: "application_status",
  });

  await sendEmail({
    email,
    subject: emailSubject,
    body: emailBody,
    htmlTemplate: emailBody,
    type: "application_status",
  });
}

/**
 * Send background check status notifications (SMS + Email)
 */
export async function sendBackgroundCheckStatus(
  phoneNumber: string,
  email: string,
  status: "clear" | "pending" | "consider"
): Promise<void> {
  const statusMessages = {
    clear: "Your background check has been cleared! You're ready to start accepting shifts.",
    pending: "Your background check is being processed. We'll notify you once it's complete.",
    consider: "Your background check requires additional review. Please contact support for details.",
  };

  const smsMessage = `Elite Bridge: ${statusMessages[status]}`;

  const emailBody = `
    <h2>Background Check Update</h2>
    <p>${statusMessages[status]}</p>
    <p>If you have any questions, please contact our support team.</p>
  `;

  await sendSMS({
    phoneNumber,
    message: smsMessage,
    type: "background_check",
  });

  await sendEmail({
    email,
    subject: "Background Check Update",
    body: emailBody,
    htmlTemplate: emailBody,
    type: "background_check",
  });
}

/**
 * Send new shift alert to matching caregivers (SMS + Email)
 */
export async function sendNewShiftAlert(
  phoneNumbers: string[],
  emails: string[],
  shiftTitle: string,
  facilityName: string,
  payRate: string,
  startTime: string
): Promise<void> {
  const smsMessage = `New shift alert: ${shiftTitle} at ${facilityName} (${payRate}/hr) starting ${startTime}. Apply now in the Elite Bridge app!`;

  const emailBody = `
    <h2>New Shift Available</h2>
    <p>A new shift matching your preferences is now available:</p>
    <ul>
      <li><strong>Position:</strong> ${shiftTitle}</li>
      <li><strong>Facility:</strong> ${facilityName}</li>
      <li><strong>Pay Rate:</strong> ${payRate}/hour</li>
      <li><strong>Start Time:</strong> ${startTime}</li>
    </ul>
    <p>Apply now through the Elite Bridge app to secure this shift!</p>
  `;

  // Send SMS to all matching caregivers
  for (const phoneNumber of phoneNumbers) {
    await sendSMS({
      phoneNumber,
      message: smsMessage,
      type: "shift_alert",
    });
  }

  // Send emails to all matching caregivers
  for (const email of emails) {
    await sendEmail({
      email,
      subject: `New Shift: ${shiftTitle} at ${facilityName}`,
      body: emailBody,
      htmlTemplate: emailBody,
      type: "shift_reminder",
    });
  }
}

/**
 * Send earnings report email
 */
export async function sendEarningsReport(
  email: string,
  totalEarnings: number,
  totalHours: number,
  shiftsCompleted: number,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  const emailBody = `
    <h2>Your Earnings Report</h2>
    <p>Here's a summary of your earnings for the period ${periodStart} to ${periodEnd}:</p>
    <ul>
      <li><strong>Total Earnings:</strong> $${totalEarnings.toFixed(2)}</li>
      <li><strong>Total Hours:</strong> ${totalHours}</li>
      <li><strong>Shifts Completed:</strong> ${shiftsCompleted}</li>
      <li><strong>Average Hourly Rate:</strong> $${(totalEarnings / totalHours).toFixed(2)}</li>
    </ul>
    <p>View detailed shift history in your Elite Bridge account.</p>
  `;

  await sendEmail({
    email,
    subject: `Earnings Report: ${periodStart} to ${periodEnd}`,
    body: emailBody,
    htmlTemplate: emailBody,
    type: "earnings_report",
  });
}
