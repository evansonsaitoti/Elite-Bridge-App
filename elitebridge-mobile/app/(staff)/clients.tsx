import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { getHandoffClients, type HandoffClient } from "@/lib/team-communication";

export default function MyClients() {
  const router = useRouter();
  const [clients, setClients] = useState<HandoffClient[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setClients(await getHandoffClients()); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load assigned clients"); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return () => {}; }, [load]));
  return <ScrollView style={{flex:1,backgroundColor:"#F5F9F6"}} contentContainerStyle={{padding:18,paddingBottom:36}}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
    <Text style={{fontSize:28,fontWeight:"900",color:"#095640",marginBottom:7}}>Clients</Text>
    <Text style={{color:"#64786D",marginBottom:18}}>Only clients on your assigned shifts appear here.</Text>
    {error ? <Text accessibilityRole="alert" style={{color:"#A33333",marginBottom:12}}>{error}</Text> : null}
    {loading&&!clients.length ? <ActivityIndicator color="#075B42"/> : null}
    {clients.map(c => <TouchableOpacity key={c.shiftId} accessibilityRole="button" onPress={() => router.push("/(staff)/handoff")}
      style={{backgroundColor:"#FFF",borderRadius:19,borderWidth:1,borderColor:"#DCE8E0",padding:17,marginBottom:11}}>
      <Text style={{fontWeight:"900",fontSize:18,color:"#0A4A35"}}>{c.clientName}</Text>
      <Text style={{color:"#65766C",fontSize:13,marginTop:6}}>{c.location}</Text>
      <Text style={{color:"#65766C",fontSize:12,marginTop:5}}>{c.agency} · {c.shiftStatus}</Text>
      <Text style={{color:"#075B42",fontWeight:"800",marginTop:12}}>View shared care checklist and handoff →</Text>
    </TouchableOpacity>)}
    {!loading&&!clients.length ? <Text style={{color:"#62766B"}}>No assigned clients. When your employer assigns a visit, client information appears here.</Text> : null}
  </ScrollView>;
}
