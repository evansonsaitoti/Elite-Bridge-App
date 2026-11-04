// Only scheduling information belongs in email; client names, street addresses and care notes stay in the app.
export type ShiftEmailDetails = {
  id: number; service_type: string; start_time: string | Date; end_time: string | Date;
  time_zone: string; city: string; state: string; assignment_mode: string;
};
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function buildShiftEmail(input: ShiftEmailDetails | ShiftEmailDetails[], webAppUrl: string, calendarUrl?: string) {
  const shifts = (Array.isArray(input) ? [...input] : [input]).sort((a,b) => +new Date(a.start_time) - +new Date(b.start_time));
  const list = new URL("/opportunities", webAppUrl);
  if (list.protocol !== "https:") throw new Error("Shift links require HTTPS");
  if (!shifts.length) throw new Error("No shifts supplied");
  const rows = shifts.map(shift => {
    if (!Number.isSafeInteger(shift.id) || shift.id <= 0) throw new Error("Invalid shift ID");
    const url = new URL(list);
    url.searchParams.set("shiftId", String(shift.id));
    const start = new Date(shift.start_time), end = new Date(shift.end_time);
    const fmt = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleString("en-US",{timeZone:shift.time_zone || "UTC",...options});
    const day = (date: Date) => fmt(date,{weekday:"long"}) + ", " + fmt(date,{day:"numeric"}) + " " + fmt(date,{month:"short"}).toUpperCase();
    const time = (date: Date) => fmt(date,{hour:"2-digit",minute:"2-digit",hour12:true}).toLowerCase();
    const when = day(start) + " " + time(start) + " – " + (day(start) !== day(end) ? day(end) + " " : "") + time(end);
    const location = [shift.city,shift.state].filter(Boolean).join(", ");
    return {when, location: [shift.service_type,location].filter(Boolean).join(" – "), url:url.href, month:fmt(start,{month:"long",year:"numeric"}), mode:shift.assignment_mode};
  });
  const months = [...new Set(rows.map(row => row.month))].join(" / ");
  const subject = "Open shifts available for claim · " + months;
  const instruction = rows.every(row => row.mode === "review") ? "Your agency will confirm your selection." : "Open a shift to see how to claim it.";
  const footer = (label: string, url: string, primary: boolean) => '<a href="' + escape(url) + '" style="display:inline-block;font:13px/18px Arial,sans-serif;text-decoration:none;padding:11px 14px;border-radius:6px;background-color:' + (primary ? '#0a4a35;color:#fff' : '#eaf4ef;color:#0a4a35') + '">' + label + '</a>';
  const text = [subject,"Available shifts",...rows.map(r=>r.when+"\n"+r.location+"\nView: "+r.url),instruction,calendarUrl && "Sync to my Calendar: "+calendarUrl,"Open App: "+list.href].filter(Boolean).join("\n\n");
  const html = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="background:#f1f5f8;margin:0;padding:12px 6px;font-family:Arial,sans-serif"><table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;color:#17272d"><tr><td align="center" style="padding:24px 12px 12px"><img width="140" alt="Elite Bridge Staffing" src="'+escape(new URL("/invoice-approved-logo.webp",list).href)+'"></td></tr><tr><td align="center" style="padding:12px 10px 22px;font:15px/20px Arial,sans-serif;color:#59656a">Open shifts available for claim<br><span style="color:#17272d">In '+escape(months)+'</span></td></tr><tr><td style="padding:0 14px 8px;font:bold 18px/23px Arial,sans-serif;color:#10394a">Available shifts</td></tr><tr><td style="padding:0 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'+rows.map(r=>'<tr><td style="padding:12px 5px;border-bottom:1px solid #e3e8e6;font:13px/18px Arial,sans-serif"><strong>'+escape(r.when)+'</strong><br>'+escape(r.location)+'</td><td align="right" style="width:54px;border-bottom:1px solid #e3e8e6">'+footer("View",r.url,true)+'</td></tr>').join('')+'</table></td></tr><tr><td align="center" style="padding:18px 8px">'+(calendarUrl?footer("Sync to my Calendar",calendarUrl,false)+' &nbsp; ':'')+footer("Open App",list.href,true)+'</td></tr><tr><td align="center" style="padding:0 14px 18px;font:12px/17px Arial,sans-serif;color:#59656a">'+instruction+'</td></tr></table></body></html>';
  return {subject,text,html,url:rows[0].url};
}
