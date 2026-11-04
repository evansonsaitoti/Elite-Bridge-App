import { describe, expect, it } from "vitest";
import { buildShiftEmail } from "../src/services/shift-email-template";
const shift={id:34,service_type:"Personal care",start_time:"2026-11-04T14:00:00Z",end_time:"2026-11-04T18:00:00Z",time_zone:"America/New_York",city:"Manchester",state:"MA",assignment_mode:"review"};
describe("caregiver shift email",()=>{
 it("uses facility time and a specific HTTPS link with approval wording",()=>{
 const mail=buildShiftEmail(shift,"https://app.elitebridgestaffing.com");
 expect(mail.text).toContain("9:00 AM EST – 1:00 PM EST");
 expect(mail.url).toBe("https://app.elitebridgestaffing.com/opportunities?shiftId=34");
 expect(mail.html).toContain("View shift");expect(mail.text).toContain("agency will confirm");
 });
 it("escapes fields and distinguishes overnight instant shifts",()=>{
 const mail=buildShiftEmail({...shift,city:'<script>alert(1)</script>',assignment_mode:"instant",end_time:"2026-11-05T06:00:00Z"},"https://app.elitebridgestaffing.com");
 expect(mail.html).not.toContain("<script>");expect(mail.html).toContain("&lt;script&gt;");
 expect(mail.text).toContain("Thursday, Nov 5, 2026");expect(mail.text).toContain("claim this shift");
 });
 it("rejects unsafe links and identifiers",()=>{
 expect(()=>buildShiftEmail({...shift,id:-1},"https://app.elitebridgestaffing.com")).toThrow();
 expect(()=>buildShiftEmail(shift,"http://app.elitebridgestaffing.com")).toThrow();
 });
});
