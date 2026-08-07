import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { fetchEmployerApplications, fetchEmployerCallouts, fetchEmployerShifts, sharedApiConfigured } from "../lib/shared-api";

type OpsRoute = "/timesheets" | "/coverage" | "/compliance" | "/applications" | "/ask-elite";

export default function OperationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openShifts, setOpenShifts] = useState(0);
  const [urgentShifts, setUrgentShifts] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [openCallouts, setOpenCallouts] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = async () => {
    if (!sharedApiConfigured) {
      setLoading(false);
      setSyncError("Secure agency sync is unavailable in this local preview.");
      return;
    }
    try {
      setRefreshing(true);
      setSyncError(null);
      const [shifts, applications, callouts] = await Promise.all([
        fetchEmployerShifts(),
        fetchEmployerApplications(),
        fetchEmployerCallouts(),
      ]);
      const open = shifts.filter((item) => item.status === "open");
      setOpenShifts(open.length);
      setUrgentShifts(open.filter((item) => item.urgency === "urgent").length);
      setPendingApplications(applications.filter((item) => item.status === "pending").length);
      setOpenCallouts(callouts.filter((item) => item.status === "open").length);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not refresh operations.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const priority = useMemo(() => {
    if (openCallouts > 0) return { title: "Resolve active caregiver call-outs.", body: `${openCallouts} assigned shift${openCallouts === 1 ? " has" : "s have"} reopened for urgent replacement coverage.`, route: "/coverage" as OpsRoute, label: "Open Coverage Copilot" };
    if (urgentShifts > 0) return { title: "Urgent open shifts need coverage.", body: `${urgentShifts} urgent shift${urgentShifts === 1 ? " is" : "s are"} currently unassigned.`, route: "/coverage" as OpsRoute, label: "Review coverage" };
    if (pendingApplications > 0) return { title: "Caregiver applications are waiting.", body: `${pendingApplications} application${pendingApplications === 1 ? " needs" : "s need"} an agency decision.`, route: "/applications" as OpsRoute, label: "Review applications" };
    return { title: "No urgent staffing exception is open.", body: "Use Ask Elite for a live briefing across coverage, applications and workforce risk.", route: "/ask-elite" as OpsRoute, label: "Ask Elite" };
  }, [openCallouts, urgentShifts, pendingApplications]);

  const items: Array<{ title: string; detail: string; action: string; route: OpsRoute }> = [
    { title: "Coverage", detail: `${openCallouts} call-outs · ${urgentShifts} urgent shifts`, action: "Open", route: "/coverage" },
    { title: "Applications", detail: `${pendingApplications} pending caregiver decisions`, action: "Review", route: "/applications" },
    { title: "Timesheets", detail: "Review visit time before payroll processing", action: "Review", route: "/timesheets" },
    { title: "Compliance", detail: "Massachusetts-aware agency checks and reminders", action: "Open", route: "/compliance" },
    { title: "Ask Elite", detail: "Live operations briefing from agency data", action: "Ask", route: "/ask-elite" },
  ];

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
    <Text style={s.eye}>ELITE BRIDGE EMPLOYER</Text><Text style={s.title}>Operations</Text><Text style={s.sub}>One operational inbox for coverage, applications, time review, compliance and AI-assisted prioritization.</Text>

    {loading ? <ActivityIndicator color="#0A4A35" style={{ marginVertical: 24 }} /> : null}
    {syncError ? <View style={s.error}><Text style={s.errorTitle}>Operations sync needs attention</Text><Text style={s.errorText}>{syncError}</Text><TouchableOpacity style={s.retry} onPress={() => void refresh()}><Text style={s.retryText}>Try again</Text></TouchableOpacity></View> : null}

    {!loading ? <View style={s.ai}><Text style={s.aiEye}>OPERATIONS COPILOT</Text><Text style={s.aiTitle}>{priority.title}</Text><Text style={s.aiText}>{priority.body}</Text><TouchableOpacity style={s.aiButton} onPress={()=>router.push(priority.route)}><Text style={s.aiButtonText}>{priority.label}</Text></TouchableOpacity></View> : null}

    <View style={s.snapshot}>
      <View style={s.metric}><Text style={s.metricValue}>{openShifts}</Text><Text style={s.metricLabel}>Open shifts</Text></View>
      <View style={s.metric}><Text style={s.metricValue}>{pendingApplications}</Text><Text style={s.metricLabel}>Applications</Text></View>
      <View style={s.metric}><Text style={s.metricValue}>{openCallouts}</Text><Text style={s.metricLabel}>Call-outs</Text></View>
    </View>

    {items.map(i=><View key={i.title} style={s.card}><View style={{flex:1}}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.meta}>{i.detail}</Text></View><TouchableOpacity style={s.button} onPress={()=>router.push(i.route)}><Text style={s.buttonText}>{i.action}</Text></TouchableOpacity></View>)}
  </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:90},eye:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:"#C58A24"},title:{fontSize:30,fontWeight:"900",color:"#101828",marginTop:4},sub:{color:"#667085",marginTop:6,marginBottom:16,lineHeight:20},ai:{backgroundColor:"#0A4A35",borderRadius:18,padding:17,marginBottom:16},aiEye:{color:"#EBCB8B",fontSize:10,fontWeight:"900",letterSpacing:1.3},aiTitle:{color:"white",fontSize:19,fontWeight:"900",marginTop:7},aiText:{color:"#D8E9E2",fontSize:13,lineHeight:19,marginTop:7},aiButton:{alignSelf:"flex-start",marginTop:12,backgroundColor:"white",paddingHorizontal:13,paddingVertical:10,borderRadius:10},aiButtonText:{color:"#0A4A35",fontWeight:"900"},snapshot:{flexDirection:"row",gap:8,marginBottom:16},metric:{flex:1,backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:13,padding:12},metricValue:{fontSize:23,fontWeight:"900",color:"#0A4A35"},metricLabel:{fontSize:10,color:"#667085",fontWeight:"700",marginTop:2},card:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:15,padding:15,marginBottom:11,flexDirection:"row",alignItems:"center",gap:12},cardTitle:{fontSize:16,fontWeight:"900",color:"#101828"},meta:{fontSize:12,color:"#667085",marginTop:4,lineHeight:17},button:{backgroundColor:"#ECF6F1",paddingHorizontal:12,paddingVertical:9,borderRadius:9},buttonText:{color:"#0A4A35",fontWeight:"900",fontSize:12},error:{backgroundColor:"#FEE4E2",borderRadius:14,padding:13,marginBottom:14},errorTitle:{color:"#B42318",fontWeight:"900"},errorText:{color:"#7A271A",fontSize:12,lineHeight:18,marginTop:4},retry:{alignSelf:"flex-start",backgroundColor:"#B42318",borderRadius:9,paddingHorizontal:11,paddingVertical:8,marginTop:8},retryText:{color:"white",fontWeight:"900",fontSize:11}});
