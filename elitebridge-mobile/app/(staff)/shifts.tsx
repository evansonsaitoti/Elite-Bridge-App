import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
    <Text style={{color:"#095640",fontSize:27,fontWeight:"900",marginBottom:6}}>My Shifts</Text>
    <Text style={{color:"#66796E",marginBottom:16}}>Assigned visits synchronize with Elite Work.</Text>
    {error ? <Text accessibilityRole="alert" style={{color:"#A33333",marginBottom:12}}>{error}</Text> : null}
    {loading && !rows.length ? <ActivityIndicator color="#075B42"/> : null}
    <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/clock")} style={{backgroundColor:"#075B42",borderRadius:18,padding:16,marginBottom:18}}>
      <Text style={{color:"#FFFFFF",fontSize:16,fontWeight:"800"}}>Open clock and shift time records →</Text>
    </TouchableOpacity>
    <View style={{flexDirection:"row",gap:10,marginBottom:18}}>
      {[
        {label:"Assigned",value:accepted.length,icon:"calendar-today" as const},
        {label:"Pending",value:pending.length,icon:"hourglass-empty" as const},
      ].map(item=><View key={item.label} style={{flex:1,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#DCE9E1",borderRadius:18,padding:16}}>
        <View style={{backgroundColor:"#E9F5EC",width:42,height:42,borderRadius:14,alignItems:"center",justifyContent:"center"}}>
          <MaterialIcons name={item.icon} color="#075B42" size={24}/>
        </View>
        <Text style={{color:"#075B42",fontSize:27,fontWeight:"900",marginTop:10}}>{item.value}</Text>
        <Text style={{color:"#62786A",fontSize:12}}>{item.label}</Text>
      </View>)}
    </View>
    <Text style={{fontSize:19,fontWeight:"900",color:"#162A20",marginBottom:10}}>Assigned shifts ({accepted.length})</Text>
    {accepted.map(a => <TouchableOpacity key={a.id} accessibilityRole="button" onPress={() => router.push("/(staff)/clock")}
      style={{backgroundColor:"#FFFFFF",borderColor:"#DAE9DF",borderWidth:1,borderRadius:18,padding:17,marginBottom:10}}>
      <Text style={{fontSize:17,fontWeight:"900",color:"#0A4A35"}}>{a.shift.careRecipientName || a.shift.title}</Text>
      <Text style={{color:"#52695D",fontSize:13,marginTop:6}}>{new Date(a.shift.startTime).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})} – {new Date(a.shift.endTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</Text>
      <Text style={{color:"#52695D",marginTop:5}}>{a.shift.location.address}, {a.shift.location.city}</Text>
      <Text style={{color:"#075B42",fontWeight:"800",marginTop:9}}>View time clock →</Text>
    </TouchableOpacity>)}
    {!loading && !accepted.length && !error ? <View style={{backgroundColor:"#FFFFFF",borderRadius:20,borderWidth:1,borderColor:"#DCE9E1",padding:23,alignItems:"center",marginBottom:15}}>
      <View style={{padding:16,borderRadius:20,backgroundColor:"#EAF5EE"}}>
        <MaterialIcons name="event-note" size={42} color="#075B42" />
      </View>
      <Text style={{fontWeight:"900",fontSize:18,color:"#173D2A",marginTop:14}}>No upcoming assigned shifts</Text>
      <Text style={{color:"#62786A",fontSize:13,lineHeight:19,textAlign:"center",marginTop:7}}>
        Your confirmed visits will appear here as soon as your agency assigns them.
      </Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/opportunities")}
        style={{backgroundColor:"#EAF4EF",paddingHorizontal:19,paddingVertical:12,borderRadius:14,marginTop:16}}>
        <Text style={{color:"#075B42",fontWeight:"900"}}>Find available shifts</Text>
      </TouchableOpacity>
    </View> : null}
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
