import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSharedTimekeeping } from "@/hooks/use-shared-timekeeping";
import { calculateWorkedHours } from "@/lib/timekeeping";
const safe = (v:string) => v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export default function Timesheets() {
  const router=useRouter();
  const {entries,ready,error,refresh}=useSharedTimekeeping();
  const [busy,setBusy]=useState(false);
  const completed=entries.filter(e=>Boolean(e.clockOutAt)).sort((a,b)=>new Date(b.clockInAt).getTime()-new Date(a.clockInAt).getTime());
  const hours=completed.reduce((sum,e)=>sum+calculateWorkedHours(e),0);
  const generate=async()=>{
    if(busy || !completed.length || error)return;
    setBusy(true);
    try {
      const rows=completed.map(e=>'<tr><td>'+safe(e.clientName)+'</td><td>'+safe(new Date(e.clockInAt).toLocaleString("en-US"))+'</td><td>'+safe(new Date(e.clockOutAt!).toLocaleString("en-US"))+'</td><td>'+calculateWorkedHours(e).toFixed(2)+'</td><td>'+safe(e.status.replace(/_/g," "))+'</td></tr>').join("");
      const html='<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>body{font-family:Helvetica,Arial,sans-serif;padding:24px;color:#153729}h1{color:#075B42}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #d7e7dc;padding:8px;text-align:left}th{background:#e7f4eb}</style></head><body><h1>Elite Care · Caregiver Timesheet</h1><p>Generated '+safe(new Date().toLocaleString("en-US"))+' · Completed visits: '+completed.length+' · Recorded hours: '+hours.toFixed(2)+'</p><table><thead><tr><th>Shift</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table><p>For agency verification; pending entries are not payroll approvals.</p></body></html>';
      const result=await Print.printToFileAsync({html});
      if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri,{mimeType:"application/pdf",dialogTitle:"Share Elite Care timesheet"});
      else await Print.printAsync({html});
    } catch(e) {Alert.alert("Could not generate PDF",e instanceof Error?e.message:"Try again.");}
    finally{setBusy(false);}
  };
  return <ScrollView style={{flex:1,backgroundColor:"#F5F9F6"}} contentContainerStyle={{padding:18,paddingBottom:35}}
    refreshControl={<RefreshControl refreshing={!ready} onRefresh={()=>void refresh()}/>}>
    <Text style={{color:"#075B42",fontSize:28,fontWeight:"900"}}>Timesheet</Text>
    <Text style={{color:"#657B6C",marginTop:5,marginBottom:18}}>Your clock-in and clock-out entries, synchronized with Elite Work.</Text>
    {error?<Text accessibilityRole="alert" style={{color:"#A33333",marginBottom:12}}>{error}</Text>:null}
    {!ready?<ActivityIndicator color="#075B42"/>:null}
    <View style={{backgroundColor:"#FFF",borderColor:"#DEE9E0",borderWidth:1,borderRadius:20,padding:18,marginBottom:15}}>
      <Text style={{fontWeight:"800",color:"#657B6C"}}>Completed shifts</Text>
      <Text style={{fontSize:28,color:"#075B42",fontWeight:"900",marginTop:5}}>{completed.length}</Text>
      <Text style={{color:"#657B6C",marginTop:5}}>Recorded working hours: {hours.toFixed(2)}</Text>
    </View>
    <TouchableOpacity accessibilityRole="button" disabled={!completed.length||busy||!ready||Boolean(error)} onPress={()=>void generate()}
      style={{backgroundColor:!completed.length||busy?"#9BB6A8":"#075B42",padding:18,borderRadius:35,alignItems:"center",marginBottom:14}}>
      <Text style={{color:"#FFF",fontWeight:"900",fontSize:17}}>{busy?"Generating…":"Generate & Share PDF"}</Text>
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" onPress={()=>router.push("/(staff)/clock")} style={{backgroundColor:"#E8F5ED",borderRadius:15,padding:15,marginBottom:19}}>
      <Text style={{color:"#075B42",fontWeight:"900"}}>Clock records, break details & corrections →</Text>
    </TouchableOpacity>
    {completed.map(e=><View key={e.id+e.clockInAt} style={{backgroundColor:"#FFF",borderWidth:1,borderColor:"#E0EAE3",borderRadius:16,padding:16,marginBottom:10}}>
      <Text style={{fontSize:16,fontWeight:"900",color:"#123D2B"}}>{e.clientName}</Text>
      <Text style={{color:"#63796D",fontSize:12,marginTop:6}}>{new Date(e.clockInAt).toLocaleString("en-US")} – {new Date(e.clockOutAt!).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</Text>
      <Text style={{color:"#075B42",marginTop:7,fontWeight:"800"}}>{calculateWorkedHours(e).toFixed(2)} hr · {e.status.replace(/_/g," ")}</Text>
    </View>)}
    {ready&&!completed.length&&!error?<Text style={{color:"#64796B"}}>Completed shifts will appear here after clock-out and syncing.</Text>:null}
  </ScrollView>;
}
