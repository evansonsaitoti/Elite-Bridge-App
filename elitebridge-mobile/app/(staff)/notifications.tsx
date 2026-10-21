import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { operationsApi } from "@/lib/shared-api";

type AgencyAlert = { id:number;type:string;title:string;message:string;related_id:number|null;is_read:boolean;created_at:string };
export default function Notifications() {
  const router=useRouter();
  const [alerts,setAlerts]=useState<AgencyAlert[]>([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);try {const result=await operationsApi("/notifications");setAlerts(result.notifications||[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load notifications");}finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{void load();return ()=>{};},[load]));
  const open=async(a:AgencyAlert)=>{
    try{if(!a.is_read) await operationsApi("/notifications/"+a.id+"/read","PATCH");setAlerts(v=>v.map(n=>n.id===a.id?{...n,is_read:true}:n));}catch(e){setError(e instanceof Error?e.message:"Could not mark notification as read");return;}
    if(a.type==="team_message")router.push("/(staff)/chat");
    else if(a.type==="care_handoff")router.push("/(staff)/handoff");
    else if(a.type==="timesheet_review")router.push("/(staff)/timesheets");
    else router.push("/(staff)/shifts");
  };
  const allRead=async()=>{try{await operationsApi("/notifications/read-all","POST");setAlerts(v=>v.map(a=>({...a,is_read:true})));setError("");}catch(e){setError(e instanceof Error?e.message:"Could not mark all read");}};
  return <ScrollView style={{flex:1,backgroundColor:"#F5F9F6"}} contentContainerStyle={{padding:18,paddingBottom:40}}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>void load()}/>}>
    <Text style={{fontSize:28,fontWeight:"900",color:"#075B42"}}>Notifications</Text>
    <TouchableOpacity accessibilityRole="button" onPress={()=>void allRead()} style={{alignSelf:"flex-end",marginVertical:15,padding:10}}><Text style={{color:"#075B42",fontWeight:"800"}}>Mark all as read</Text></TouchableOpacity>
    {error ? <Text accessibilityRole="alert" style={{color:"#A33333",marginBottom:12}}>{error}</Text> : null}
    {loading&&!alerts.length?<ActivityIndicator color="#075B42"/>:null}
    {!loading&&!alerts.length&&!error?<Text style={{color:"#637A6D"}}>No agency notifications yet.</Text>:null}
    {alerts.map(a=><TouchableOpacity key={a.id} accessibilityRole="button" onPress={()=>void open(a)}
      style={{padding:16,marginBottom:10,borderRadius:18,borderWidth:1,borderColor:a.is_read?"#DDE8E1":"#85B9A0",backgroundColor:a.is_read?"#FFF":"#EAF5EE"}}>
      <Text style={{color:"#123D2B",fontSize:16,fontWeight:"900"}}>{a.is_read?"":"● "}{a.title}</Text>
      <Text style={{color:"#536C5E",marginTop:6,fontSize:13,lineHeight:19}}>{a.message}</Text>
      <Text style={{color:"#819084",fontSize:11,marginTop:9}}>{new Date(a.created_at).toLocaleString("en-US")}</Text>
    </TouchableOpacity>)}
  </ScrollView>;
}
