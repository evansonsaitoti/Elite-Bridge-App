import { operationsApi } from "./shared-api";

export type CareSite = {
  id:number;clientName:string;locationName:string;
  address:string;city:string;state:string;zipCode:string;
};
export type SiteTask = {
  id:number;key:string;title:string;instructions:string;
  frequency:"each_visit"|"as_needed"|"monday"|"scheduled";
  status:"pending"|"done"|"not_needed";
  checkedAt:string|null;checkedBy:string|null;
  lastDoneAt:string|null;lastDoneBy:string|null;
};
export type SiteSignoff = {
  id:number;visitDate:string;visitPeriod:"morning"|"evening"|"other";
  note:string;signedAt:string;caregiver:string;
};
export type SiteChecklist = {
  site:CareSite;visitDate:string;visitPeriod:"morning"|"evening"|"other";
  tasks:SiteTask[];recentSignoffs:SiteSignoff[];
};
export type VisitPeriod = "morning"|"evening"|"other";
export type TaskCheckStatus = "done"|"not_needed"|"pending";

export function careSiteToday():string {
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date());
  const value=(t:string)=>parts.find(p=>p.type===t)?.value||"";
  return [value("year"),value("month"),value("day")].join("-");
}
export function suggestedCarePeriod():VisitPeriod {
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",hour12:false}).formatToParts(new Date());
  const hour=Number(parts.find(p=>p.type==="hour")?.value||12);
  return hour<15?"morning":"evening";
}
export async function getCareSites():Promise<CareSite[]> {
  const data=await operationsApi("/care-site-checklists/sites");
  return data.sites||[];
}
export async function getSiteChecklist(siteId:number,visitDate:string,visitPeriod:VisitPeriod):Promise<SiteChecklist> {
  return operationsApi("/care-site-checklists/sites/"+siteId+
    "?visitDate="+encodeURIComponent(visitDate)+"&visitPeriod="+encodeURIComponent(visitPeriod));
}
export async function checkSiteTask(siteId:number,taskId:number,status:TaskCheckStatus,visitDate:string,visitPeriod:VisitPeriod){
  return operationsApi("/care-site-checklists/sites/"+siteId+"/tasks/"+taskId+"/check","POST",
    {status,visitDate,visitPeriod});
}
export async function signoffCareVisit(siteId:number,visitDate:string,visitPeriod:VisitPeriod,note=""){
  return operationsApi("/care-site-checklists/sites/"+siteId+"/signoff","POST",
    {visitDate,visitPeriod,note});
}
