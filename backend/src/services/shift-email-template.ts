// Only scheduling information belongs in email; client names, street addresses and care notes stay in the app.
export type ShiftEmailDetails = {
  id: number; service_type: string; start_time: string | Date; end_time: string | Date;
  time_zone: string; city: string; state: string; assignment_mode: string;
};
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function buildShiftEmail(shift: ShiftEmailDetails, webAppUrl: string) {
  if (!Number.isSafeInteger(shift.id) || shift.id <= 0) throw new Error("Invalid shift ID");
  const url = new URL("/view-shift", webAppUrl);
  if (url.protocol !== "https:") throw new Error("Shift links require HTTPS");
  url.searchParams.set("shiftId", String(shift.id));
  const start = new Date(shift.start_time), end = new Date(shift.end_time);
  const dateOptions: Intl.DateTimeFormatOptions = {timeZone: shift.time_zone || "UTC", weekday:"long",month:"short",day:"numeric",year:"numeric"};
  const timeOptions: Intl.DateTimeFormatOptions = {timeZone: shift.time_zone || "UTC",hour:"numeric",minute:"2-digit",timeZoneName:"short"};
  const date = start.toLocaleDateString("en-US", dateOptions);
  const endDate = end.toLocaleDateString("en-US", dateOptions);
  const hours = `${start.toLocaleTimeString("en-US", timeOptions)} – ${date !== endDate ? endDate + " " : ""}${end.toLocaleTimeString("en-US", timeOptions)}`;
  const location = [shift.city,shift.state].filter(Boolean).join(", ");
  const instruction = shift.assignment_mode === "instant" ? "Open Elite Care to review and claim this shift if you are eligible." : "Open Elite Care to review and apply. Your agency will confirm the assignment.";
  const subject = `Elite Care: Available shift — ${date}`;
  const text = ["Available shift",date,hours,shift.service_type,location,instruction,`View shift: ${url.href}`,"You can turn off shift emails in Elite Care notification settings."].join("\n\n");
  const html = `<div lang="en" style="font-family:Arial,Helvetica,sans-serif;background:#f3f7f5;padding:24px 12px;color:#101828">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border-radius:18px"><tr><td style="padding:28px">
<img src="${escape(new URL("/invoice-approved-logo.webp", url).href)}" width="210" alt="Elite Bridge Staffing" style="display:block;max-width:100%;height:auto">
<p style="color:#97671c;font-size:12px;letter-spacing:2px;margin-top:30px">ELITE CARE</p><h1 style="font-size:28px;color:#0a4a35;margin:8px 0 24px">A shift is available</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dce7e1;border-bottom:1px solid #dce7e1"><tr><td style="padding:22px 0">
<strong style="font-size:19px">${escape(date)}</strong><p style="font-size:18px;margin:8px 0">${escape(hours)}</p><p style="margin:8px 0">${escape(shift.service_type)} · ${escape(location)}</p>
<a href="${escape(url.href)}" style="display:inline-block;padding:15px 24px;margin-top:14px;border-radius:9px;background:#0a4a35;color:#fff;text-decoration:none;font-weight:bold">View shift</a>
</td></tr></table><p style="line-height:1.6">${escape(instruction)}</p><p style="color:#667085;font-size:13px;line-height:1.6">Availability may change. Manage shift emails in Elite Care notification settings.</p></td></tr></table></div>`;
  return {subject,text,html,url:url.href};
}
