import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { fetchMyApplications, type CaregiverApplication } from "@/lib/shared-api";

export default function MyShifts() {
  const router = useRouter();
  const [rows, setRows] = useState<CaregiverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchMyApplications()); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load shifts"); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => {}; }, [load]));
  const accepted = rows.filter(r => r.status === "approved").sort((a,b) => new Date(a.shift.startTime).getTime() - new Date(b.shift.startTime).getTime());
  const pending = rows.filter(r => r.status === "pending");
  return <ScrollView style={{flex:1,backgroundColor:"#F5F9F6"}} contentContainerStyle={{padding:18,paddingBottom:35}}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()}/>}>
    <Text style={{color:"#095640",fontSize:28,fontWeight:"900",marginBottom:6}}>My Shifts</Text>
    <Text style={{color:"#66796E",marginBottom:16}}>Assigned visits synchronize with Elite Work.</Text>
    {error ? <Text accessibilityRole="alert" style={{color:"#A33333",marginBottom:12}}>{error}</Text> : null}
    {loading && !rows.length ? <ActivityIndicator color="#075B42"/> : null}
    <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/clock")} style={{backgroundColor:"#075B42",borderRadius:18,padding:16,marginBottom:18}}>
      <Text style={{color:"#FFFFFF",fontSize:16,fontWeight:"800"}}>Open clock and shift time records →</Text>
    </TouchableOpacity>
    <Text style={{fontSize:19,fontWeight:"900",color:"#162A20",marginBottom:10}}>Assigned shifts ({accepted.length})</Text>
    {accepted.map(a => <TouchableOpacity key={a.id} accessibilityRole="button" onPress={() => router.push("/(staff)/clock")}
      style={{backgroundColor:"#FFFFFF",borderColor:"#DAE9DF",borderWidth:1,borderRadius:18,padding:17,marginBottom:10}}>
      <Text style={{fontSize:17,fontWeight:"900",color:"#0A4A35"}}>{a.shift.careRecipientName || a.shift.title}</Text>
      <Text style={{color:"#52695D",fontSize:13,marginTop:6}}>{new Date(a.shift.startTime).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})} – {new Date(a.shift.endTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</Text>
      <Text style={{color:"#52695D",marginTop:5}}>{a.shift.location.address}, {a.shift.location.city}</Text>
      <Text style={{color:"#075B42",fontWeight:"800",marginTop:9}}>View time clock →</Text>
    </TouchableOpacity>)}
    {!loading && !accepted.length ? <Text style={{color:"#61736A",marginBottom:15}}>No assigned visits yet.</Text> : null}
    <Text style={{fontSize:19,fontWeight:"900",color:"#162A20",marginVertical:12}}>Pending requests ({pending.length})</Text>
    {pending.map(a => <View key={a.id} style={{backgroundColor:"#FFF",borderRadius:15,padding:15,marginBottom:9}}>
      <Text style={{fontWeight:"800",color:"#19392A"}}>{a.shift.title}</Text>
      <Text style={{color:"#856B24",marginTop:5}}>Awaiting agency review</Text>
    </View>)}
    <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/opportunities")} style={{borderRadius:16,backgroundColor:"#EAF4EF",padding:16,marginTop:16}}>
      <Text style={{color:"#075B42",fontWeight:"900"}}>Browse shifts, applications and call-outs →</Text>
    </TouchableOpacity>
  </ScrollView>;
}
