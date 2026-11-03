import {expect,it} from "vitest";
import {parseShiftId,shiftOpportunityRoute} from "../lib/shift-link";
import {caregiverNotificationRoute} from "../lib/notification-route";
it("opens the selected offer from email or push without claiming it",()=>{
 expect(shiftOpportunityRoute("34")).toEqual({pathname:"/(staff)/opportunities",params:{shiftId:"34"}});
 expect(caregiverNotificationRoute("shift_offer",34)).toEqual(shiftOpportunityRoute("34"));
 expect(caregiverNotificationRoute("team_message",34)).toBe("/(staff)/chat");
});
it("rejects ambiguous and unsafe shift identifiers",()=>{
 for(const v of [null,undefined,-1,0,"1.2","34/claim",["34"],"9007199254740992","https://evil.example"]){expect(parseShiftId(v)).toBeNull();}
 expect(caregiverNotificationRoute("shift_offer","bad")).toBe("/(staff)/opportunities");
});
