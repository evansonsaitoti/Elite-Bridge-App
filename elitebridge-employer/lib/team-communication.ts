import { operationsApi } from "./api";

export type TeamContact = { id:number;name:string;role:"employer"|"caregiver" };
export type TeamMessage = {
  id:number;senderId:number;recipientId:number;content:string;
  isRead:boolean;createdAt:string;
};
export type HandoffClient = {
  shiftId:number;clientName:string;agency:string;location:string;
  shiftStart:string;shiftStatus:string;
};
export type HandoffItem = {
  id:number;kind:"note"|"task";content:string;status:"open"|"done";
  authorName:string;createdAt:string;completedAt:string|null;completedBy:number|null;
};

export async function getTeamContacts():Promise<TeamContact[]> {
  const result=await operationsApi("/team-messages/contacts");
  return result.contacts||[];
}
export async function getTeamConversation(peerId:number):Promise<TeamMessage[]> {
  const result=await operationsApi("/team-messages/"+peerId);
  return result.messages||[];
}
export async function sendTeamMessage(peerId:number,content:string):Promise<TeamMessage> {
  const result=await operationsApi("/team-messages/"+peerId,"POST",{content});
  return result.message;
}
export async function acknowledgeTeamMessages(peerId:number) {
  await operationsApi("/team-messages/"+peerId+"/read","POST");
}
export async function getHandoffClients():Promise<HandoffClient[]> {
  const result=await operationsApi("/care-handoffs/shifts");
  return result.clients||[];
}
export async function getHandoffItems(shiftId:number):Promise<HandoffItem[]> {
  const result=await operationsApi("/care-handoffs/shifts/"+shiftId+"/items");
  return result.items||[];
}
export async function postHandoff(shiftId:number,kind:"note"|"task",content:string):Promise<HandoffItem> {
  const result=await operationsApi("/care-handoffs/shifts/"+shiftId+"/items","POST",{kind,content});
  return result.item;
}
export async function completeHandoffTask(shiftId:number,itemId:number) {
  return operationsApi("/care-handoffs/shifts/"+shiftId+"/items/"+itemId+"/complete","PATCH");
}
