import { useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getEmployerSession, isDemoEmployerSession } from "../lib/employer-storage";
import { fetchEmployerApplications, sharedApiConfigured, updateEmployerApplication, type EmployerApplication } from "../lib/shared-api";

const DEMO_APPLICATION: EmployerApplication = {
  id: 8101,
  shift_id: 8001,
  caregiver_id: 22,
  status: "pending",
  note: "Available and nearby.",
  created_at: new Date().toISOString(),
  shift_title: "Companionship + meal prep",
  service_type: "Companionship + meal prep",
  start_time: new Date(Date.now() + 18_000_000).toISOString(),
  end_time: new Date(Date.now() + 32_400_000).toISOString(),
  city: "Lowell",
  state: "MA",
  caregiver_user_id: 22,
  first_name: "Demo",
  last_name: "Caregiver",
  email: "demo-caregiver@example.com",
  rating: "4.9",
  total_hours: "124",
  certifications: ["HHA", "CPR"],
};

function fitScore(item: EmployerApplication) {
  const rating = Number(item.rating || 0);
  const hours = Number(item.total_hours || 0);
  const certificationBoost = Array.isArray(item.certifications) ? Math.min(item.certifications.length * 3, 9) : 0;
  return Math.min(98, Math.round(62 + rating * 5 + Math.min(hours / 20, 12) + certificationBoost));
}

function fitReason(item: EmployerApplication) {
  const reasons = [];
  if (Number(item.rating || 0) >= 4.5) reasons.push("strong reliability history");
  if (Number(item.total_hours || 0) >= 100) reasons.push("experienced on platform");
  if (Array.isArray(item.certifications) && item.certifications.length) reasons.push(`${item.certifications.length} verified credential signals`);
  return reasons.length ? reasons.join(" · ") : "Review availability, credentials and client continuity before assigning.";
}

export default function ApplicationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<EmployerApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const load = async () => {
    const session = await getEmployerSession();
    const demo = isDemoEmployerSession(session);
    setDemoMode(demo);
    if (demo) {
      setItems((current) => current.length > 0 ? current : [DEMO_APPLICATION]);
      return;
    }
    if (!sharedApiConfigured) return;
    try {
      setRefreshing(true);
      setItems(await fetchEmployerApplications());
    } catch (error) {
      Alert.alert("Could not refresh applications", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const pending = useMemo(() => items.filter((item) => item.status === "pending"), [items]);

  const update = async (item: EmployerApplication, status: "approved" | "rejected") => {
    try {
      setWorkingId(item.id);
      if (demoMode) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
        Alert.alert(status === "approved" ? "Demo caregiver assigned" : "Demo application declined", "This change is stored only in the demo workspace on this device.");
        return;
      }
      if (!sharedApiConfigured) {
        Alert.alert("Agency sync required", "Connect to the shared agency service before making assignment decisions.");
        return;
      }
      await updateEmployerApplication(item.id, status);
      await load();
      Alert.alert(status === "approved" ? "Caregiver assigned" : "Application declined", status === "approved" ? "The shift is now assigned and will move into the caregiver's upcoming work." : "The caregiver will see the application update in Elite Bridge.");
    } catch (error) {
      Alert.alert("Could not update application", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setWorkingId(null);
    }
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
    <View style={styles.topRow}><TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity><View style={styles.badge}><Text style={styles.badgeText}>{demoMode ? "DEMO DATA" : sharedApiConfigured ? "LIVE SYNC" : "LOCAL PREVIEW"}</Text></View></View>
    <Text style={styles.eyebrow}>WORKFORCE MATCHING</Text>
    <Text style={styles.title}>Shift Applications</Text>
    <Text style={styles.subtitle}>Review applicants with decision support, then keep the final assignment human-approved.</Text>

    <View style={styles.summary}><View><Text style={styles.summaryValue}>{pending.length}</Text><Text style={styles.summaryLabel}>Awaiting review</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryValue}>{items.filter((item) => item.status === "approved").length}</Text><Text style={styles.summaryLabel}>Assigned</Text></View></View>

    {items.map((item) => {
      const score = fitScore(item);
      const date = new Date(item.start_time);
      return <View key={item.id} style={styles.card}>
        <View style={styles.cardTop}><View style={{ flex: 1 }}><Text style={styles.name}>{item.first_name} {item.last_name}</Text><Text style={styles.meta}>{item.shift_title}</Text><Text style={styles.meta}>{Number.isNaN(date.getTime()) ? "Scheduled" : date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {item.city}, {item.state}</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{score}</Text><Text style={styles.scoreLabel}>FIT</Text></View></View>
        <View style={styles.aiBox}><Text style={styles.aiEyebrow}>ELITE MATCH SIGNAL</Text><Text style={styles.aiText}>{fitReason(item)}</Text><Text style={styles.guardrail}>AI assists prioritization only. Verify credentials, availability and agency policy before assignment.</Text></View>
        <Text style={[styles.status, item.status === "approved" ? styles.approved : item.status === "rejected" ? styles.rejected : styles.pending]}>{item.status.toUpperCase()}</Text>
        {item.status === "pending" && <View style={styles.actions}><TouchableOpacity disabled={workingId === item.id} onPress={() => void update(item, "rejected")} style={styles.reject}><Text style={styles.rejectText}>Decline</Text></TouchableOpacity><TouchableOpacity disabled={workingId === item.id} onPress={() => void update(item, "approved")} style={styles.approve}><Text style={styles.approveText}>{workingId === item.id ? "Updating…" : "Assign caregiver"}</Text></TouchableOpacity></View>}
      </View>;
    })}

    {items.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>No applications yet</Text><Text style={styles.meta}>When caregivers apply to shared shifts, they will appear here automatically.</Text></View>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:70},topRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:22},back:{color:"#0A4A35",fontWeight:"900"},badge:{backgroundColor:"#EAF7EF",paddingHorizontal:10,paddingVertical:6,borderRadius:999},badgeText:{color:"#0A4A35",fontSize:10,fontWeight:"900",letterSpacing:1},eyebrow:{color:"#C58A24",fontWeight:"900",fontSize:10,letterSpacing:1.5},title:{color:"#101828",fontSize:30,fontWeight:"900",marginTop:5},subtitle:{color:"#667085",lineHeight:20,marginTop:7,marginBottom:18},summary:{flexDirection:"row",backgroundColor:"#0A4A35",borderRadius:18,padding:18,marginBottom:16,justifyContent:"space-around"},summaryValue:{color:"white",fontSize:26,fontWeight:"900",textAlign:"center"},summaryLabel:{color:"#D9E9E2",fontSize:11,fontWeight:"700",marginTop:3},summaryDivider:{width:1,backgroundColor:"#39715F"},card:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:17,padding:16,marginBottom:12},cardTop:{flexDirection:"row",gap:12,alignItems:"flex-start"},name:{color:"#101828",fontSize:18,fontWeight:"900"},meta:{color:"#667085",fontSize:12,lineHeight:18,marginTop:4},score:{width:58,height:58,borderRadius:17,backgroundColor:"#ECF6F1",alignItems:"center",justifyContent:"center"},scoreValue:{color:"#0A4A35",fontSize:20,fontWeight:"900"},scoreLabel:{color:"#0A4A35",fontSize:8,fontWeight:"900",letterSpacing:1},aiBox:{backgroundColor:"#F8FAFC",borderRadius:12,padding:12,marginTop:14},aiEyebrow:{color:"#C58A24",fontSize:9,fontWeight:"900",letterSpacing:1.2},aiText:{color:"#344054",fontSize:12,lineHeight:18,marginTop:5},guardrail:{color:"#98A2B3",fontSize:10,lineHeight:15,marginTop:7},status:{alignSelf:"flex-start",marginTop:12,borderRadius:999,overflow:"hidden",paddingHorizontal:9,paddingVertical:6,fontSize:10,fontWeight:"900"},pending:{backgroundColor:"#FFF6E6",color:"#B54708"},approved:{backgroundColor:"#ECFDF3",color:"#067647"},rejected:{backgroundColor:"#FEF3F2",color:"#B42318"},actions:{flexDirection:"row",gap:9,marginTop:14},reject:{flex:1,borderWidth:1,borderColor:"#FDA29B",borderRadius:10,padding:12,alignItems:"center"},rejectText:{color:"#B42318",fontWeight:"900"},approve:{flex:1.4,backgroundColor:"#0A4A35",borderRadius:10,padding:12,alignItems:"center"},approveText:{color:"white",fontWeight:"900"},empty:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:16,padding:24,alignItems:"center"},emptyTitle:{color:"#101828",fontSize:17,fontWeight:"900"}
});
