// Only scheduling information belongs in email; client names, street addresses and care notes stay in the app.
export type ShiftEmailDetails = {
  id: number; service_type: string; start_time: string | Date; end_time: string | Date;
  time_zone: string; city: string; state: string; assignment_mode: string;
};
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function buildShiftEmail(shift: ShiftEmailDetails, webAppUrl: string) {
  if (!Number.isSafeInteger(shift.id) || shift.id <= 0) throw new Error("Invalid shift ID");
  const url = new URL("/opportunities", webAppUrl);
  if (url.protocol !== "https:") throw new Error("Shift links require HTTPS");
  url.searchParams.set("shiftId", String(shift.id));
  const start = new Date(shift.start_time), end = new Date(shift.end_time);
  const dateOptions: Intl.DateTimeFormatOptions = {timeZone: shift.time_zone || "UTC", weekday:"long",month:"short",day:"numeric",year:"numeric"};
  const timeOptions: Intl.DateTimeFormatOptions = {timeZone: shift.time_zone || "UTC",hour:"numeric",minute:"2-digit",timeZoneName:"short"};
  const date = start.toLocaleDateString("en-US", dateOptions);
  const endDate = end.toLocaleDateString("en-US", dateOptions);
  const hours = `${start.toLocaleTimeString("en-US", timeOptions)} – ${date !== endDate ? endDate + " " : ""}${end.toLocaleTimeString("en-US", timeOptions)}`;
  const location = [shift.city,shift.state].filter(Boolean).join(", ");
  const instruction = shift.assignment_mode === "instant" ? "Review the details and claim this shift if you are eligible." : "Review the details and apply. Your agency will confirm the assignment.";
  const subject = `Elite Care: Available shift — ${date}`;
  const text = ["Available shift",date,hours,shift.service_type,location,instruction,`View shift: ${url.href}`,"Manage shift emails in your app notification settings."].join("\n\n");
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>Available shift</title></head>
<body style="margin:0;background-color:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#172b24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6f5"><tr><td align="center" style="padding-top:32px;padding-right:16px;padding-bottom:32px;padding-left:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff" bgcolor="#ffffff">
<tr><td align="center" style="padding-top:36px;padding-right:28px;padding-bottom:30px;padding-left:28px;border-bottom:3px solid #c68c2e">
<img src="${escape(new URL("/invoice-approved-logo.webp", url).href)}" width="210" border="0" alt="Elite Bridge Staffing" style="display:block;width:210px;max-width:100%;height:auto">
</td></tr>
<tr><td style="padding-top:32px;padding-right:32px;padding-bottom:32px;padding-left:32px">
<h1 style="font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:34px;font-weight:600;color:#0a4a35;margin-top:0;margin-bottom:24px">Available shift</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-bottom:22px;border-bottom:1px solid #e3e9e5">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:27px;color:#172b24;margin-top:0;margin-bottom:6px;font-weight:bold">${escape(date)}</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:27px;color:#172b24;margin-top:0;margin-bottom:12px">${escape(hours)}</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#53655c;margin-top:0;margin-bottom:0">${escape(shift.service_type)} · ${escape(location)}</p>
</td></tr></table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:25px;color:#53655c;margin-top:22px;margin-bottom:24px">${escape(instruction)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#0a4a35" style="background-color:#0a4a35;border-radius:6px">
<a href="${escape(url.href)}" style="display:inline-block;padding-top:15px;padding-right:30px;padding-bottom:15px;padding-left:30px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:22px;color:#ffffff;text-decoration:none;font-weight:bold">View shift</a>
</td></tr></table>
</td></tr>
<tr><td bgcolor="#f8faf9" style="background-color:#f8faf9;padding-top:20px;padding-right:32px;padding-bottom:20px;padding-left:32px;border-top:1px solid #e3e9e5">
<p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#68776f;margin-top:0;margin-bottom:0">Availability may change. Manage shift emails in your app notification settings.</p>
</td></tr></table></td></tr></table></body></html>`;
  return {subject,text,html,url:url.href};
}
