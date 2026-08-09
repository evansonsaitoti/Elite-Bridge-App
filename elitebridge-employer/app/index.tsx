import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getEmployerSession } from "../lib/employer-storage";
import {
  fetchEmployerApplications,
  fetchEmployerCallouts,
  fetchEmployerShifts,
  sharedApiConfigured,
  type EmployerApplication,
  type EmployerCallout,
  type SharedShift,
} from "../lib/shared-api";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Shift";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const demoShift: SharedShift = {
  id: 8001,
  employerId: 1,
  employerName: "Elite Bridge Demo Agency",
  title: "Companionship + meal prep · Mrs. A.",
  serviceType: "Companionship + meal prep",
  caregiverType: "HHA / PCA",
  careRecipientName: "Mrs. A.",
  startTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
  endTime: new Date(Date.now() + 1000 * 60 * 60 * 9).toISOString(),
  location: { type: "client_home", address: "Lowell", city: "Lowell", state: "MA", zipCode: "01852" },
  hourlyRate: 35,
  requirements: [],
  responsibilities: "Companionship, light meal preparation, safety check and family update.",
  urgency: "urgent",
  status: "open",
};

const demoAssignedShift: SharedShift = {
  ...demoShift,
  id: 8002,
  title: "Respite care · Troy",
  serviceType: "Respite care",
  careRecipientName: "Troy",
  urgency: "standard",
  status: "assigned",
  startTime: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(),
  endTime: new Date(Date.now() + 1000 * 60 * 60 * 32).toISOString(),
};

const demoApplication: EmployerApplication = {
  id: 8101,
  shift_id: demoShift.id,
  caregiver_id: 22,
  status: "pending",
  note: "Available and nearby.",
  created_at: new Date().toISOString(),
  shift_title: demoShift.title,
  service_type: demoShift.serviceType,
  start_time: demoShift.startTime,
  end_time: demoShift.endTime,
  city: "Lowell",
  state: "MA",
  caregiver_user_id: 22,
  first_name: "Demo",
  last_name: "Caregiver",
  email: "caregiver@elitebridge.test",
  rating: "4.9",
  total_hours: "124",
  certifications: ["HHA", "CPR"],
};

const demoCallout: EmployerCallout = {
  id: 8201,
  shift_id: demoShift.id,
  reason: "transportation",
  note: "Original caregiver may be delayed.",
  status: "open",
  created_at: new Date().toISOString(),
  title: demoShift.title,
  service_type: demoShift.serviceType,
  care_recipient_name: demoShift.careRecipientName,
  start_time: demoShift.startTime,
  end_time: demoShift.endTime,
  city: "Lowell",
  state: "MA",
  hourly_rate: demoShift.hourlyRate,
  urgency: "urgent",
  first_name: "Demo",
  last_name: "Caregiver",
  offers_sent: 3,
  offers_accepted: 1,
};

export default function EmployerHome() {
  const router = useRouter();
  const [shifts, setShifts] = useState<SharedShift[]>([]);
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [callouts, setCallouts] = useState<EmployerCallout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = async () => {
    const session = await getEmployerSession();
    const isDemo = session?.email.endsWith("@elitebridge.test");
    if (isDemo || !sharedApiConfigured) {
      setShifts([demoShift, demoAssignedShift]);
      setApplications([demoApplication]);
      setCallouts([demoCallout]);
      setLoading(false);
      setSyncError(null);
      return;
    }
    try {
      setRefreshing(true);
      setSyncError(null);
      const [liveShifts, liveApplications, liveCallouts] = await Promise.all([
        fetchEmployerShifts(),
        fetchEmployerApplications(),
        fetchEmployerCallouts(),
      ]);
      setShifts(liveShifts);
      setApplications(liveApplications);
      setCallouts(liveCallouts);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not refresh agency operations.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const openShifts = shifts.filter((item) => item.status === "open");
  const assignedShifts = shifts.filter((item) => item.status === "assigned");
  const pendingApplications = applications.filter((item) => item.status === "pending");
  const openCallouts = callouts.filter((item) => item.status === "open");
  const urgentOpen = openShifts.filter((item) => item.urgency === "urgent");

  const nextShifts = useMemo(
    () => shifts
      .filter((item) => new Date(item.endTime).getTime() >= Date.now())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 3),
    [shifts],
  );

  const priority = openCallouts.length > 0
    ? { eyebrow: "COVERAGE COPILOT", title: `${openCallouts.length} caregiver call-out${openCallouts.length === 1 ? " needs" : "s need"} rescue`, body: "Elite can rank available caregivers and send priority offers. Final assignment remains with your scheduler.", action: "Open coverage", route: "/coverage" as const }
    : urgentOpen.length > 0
      ? { eyebrow: "COVERAGE COPILOT", title: `${urgentOpen.length} urgent shift${urgentOpen.length === 1 ? " needs" : "s need"} coverage`, body: pendingApplications.length > 0 ? `${pendingApplications.length} caregiver application${pendingApplications.length === 1 ? " is" : "s are"} ready for agency review.` : "Keep the shift visible while caregivers respond to the live feed.", action: "Review coverage", route: "/coverage" as const }
      : pendingApplications.length > 0
        ? { eyebrow: "APPLICATIONS", title: `${pendingApplications.length} caregiver application${pendingApplications.length === 1 ? " is" : "s are"} waiting`, body: "Review worker details and confirm or reject each application. Elite never makes the hiring decision automatically.", action: "Review applications", route: "/applications" as const }
        : { eyebrow: "ASK ELITE", title: "Agency operations are synchronized", body: "Ask Elite for a live briefing across coverage, applications, workforce availability and upcoming assignments.", action: "Ask Elite", route: "/ask-elite" as const };

  const stats = [
    { value: openShifts.length, label: "Open shifts", tone: "#FDECEC", valueColor: "#B42318" },
    { value: assignedShifts.length, label: "Assigned", tone: "#EAF7EF", valueColor: "#087443" },
    { value: pendingApplications.length, label: "Applications", tone: "#EEF4FF", valueColor: "#175CD3" },
    { value: openCallouts.length, label: "Call-outs", tone: "#FFF6E6", valueColor: "#B54708" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.brandRow}>
          <View><Text style={styles.brand}>ELITE BRIDGE</Text><Text style={styles.brandSub}>EMPLOYER</Text></View>
          <View style={styles.maBadge}><Text style={styles.maBadgeText}>MASSACHUSETTS</Text></View>
        </View>

        <Text style={styles.heading}>{greeting()}</Text>
        <Text style={styles.subheading}>Here is the live agency picture and the next action that deserves attention.</Text>

        {loading ? <ActivityIndicator color="#0A4A35" style={{ marginVertical: 24 }} /> : null}
        {syncError ? <View style={styles.error}><Text style={styles.errorTitle}>Agency sync needs attention</Text><Text style={styles.errorText}>{syncError}</Text><TouchableOpacity style={styles.retry} onPress={() => void refresh()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : null}

        <View style={styles.statGrid}>{stats.map((stat) => <View key={stat.label} style={[styles.statCard,{backgroundColor:stat.tone}]}><Text style={[styles.statValue,{color:stat.valueColor}]}>{stat.value}</Text><Text style={styles.statLabel}>{stat.label}</Text></View>)}</View>

        <View style={styles.commandCard}>
          <Text style={styles.commandEyebrow}>ASK ELITE</Text><Text style={styles.commandTitle}>What do you want to get done?</Text>
          <TouchableOpacity style={styles.commandInput} onPress={() => router.push("/ask-elite")}><Text style={styles.commandPlaceholder}>“What needs my attention before tomorrow?”</Text></TouchableOpacity>
          <View style={styles.promptRow}><TouchableOpacity onPress={() => router.push("/ask-elite")}><Text style={styles.promptChip}>Coverage risks</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push("/ask-elite")}><Text style={styles.promptChip}>Overtime risk</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push("/ask-elite")}><Text style={styles.promptChip}>Applications</Text></TouchableOpacity></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Operations priority</Text><TouchableOpacity onPress={() => router.push("/operations")}><Text style={styles.sectionLink}>Operations</Text></TouchableOpacity></View>
        <View style={styles.aiCard}><Text style={styles.aiEyebrow}>{priority.eyebrow}</Text><Text style={styles.aiTitle}>{priority.title}</Text><Text style={styles.aiBody}>{priority.body}</Text><TouchableOpacity style={styles.aiButton} onPress={() => router.push(priority.route)}><Text style={styles.aiButtonText}>{priority.action}</Text></TouchableOpacity></View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Next shifts</Text><TouchableOpacity onPress={() => router.push("/schedule")}><Text style={styles.sectionLink}>Schedule</Text></TouchableOpacity></View>
        <View style={styles.scheduleCard}>
          {nextShifts.map((shift, index) => <View key={shift.id}>{index > 0 ? <View style={styles.divider} /> : null}<TouchableOpacity style={styles.scheduleRow} onPress={() => shift.status === "open" ? router.push("/coverage") : router.push("/schedule")}><View style={[styles.timeBadge, shift.status === "open" && styles.timeBadgeRisk]}><Text style={[styles.timeBadgeText, shift.status === "open" && styles.timeBadgeRiskText]}>{formatTime(shift.startTime)}</Text></View><View style={styles.scheduleCopy}><Text style={styles.scheduleTitle}>{shift.serviceType}{shift.careRecipientName ? ` · ${shift.careRecipientName}` : ""}</Text><Text style={styles.scheduleMeta}>{shift.location.city}, {shift.location.state} · {shift.status === "assigned" ? "Assigned" : shift.urgency === "urgent" ? "Urgent coverage" : "Open"}</Text></View><Text style={shift.status === "assigned" ? styles.covered : styles.atRisk}>{shift.status === "assigned" ? "Covered" : "Cover →"}</Text></TouchableOpacity></View>)}
          {nextShifts.length === 0 ? <Text style={styles.empty}>No upcoming shifts yet. Create a shift in Schedule to publish it to caregivers.</Text> : null}
        </View>

        <Text style={styles.footerNote}>Massachusetts-first workforce operations for care agencies.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({safeArea:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:20,paddingBottom:48},brandRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:28},brand:{color:"#0A4A35",fontSize:16,fontWeight:"900",letterSpacing:1.4},brandSub:{marginTop:2,color:"#C58A24",fontSize:11,fontWeight:"900",letterSpacing:2.2},maBadge:{backgroundColor:"#EAF4EF",borderRadius:999,paddingHorizontal:12,paddingVertical:7},maBadgeText:{color:"#0A4A35",fontSize:9,fontWeight:"900",letterSpacing:.7},heading:{color:"#101828",fontSize:32,fontWeight:"900",letterSpacing:-.7},subheading:{color:"#667085",fontSize:15,lineHeight:22,marginTop:6,marginBottom:20},statGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:18},statCard:{width:"48%",minHeight:108,borderRadius:18,padding:16,justifyContent:"center"},statValue:{fontSize:28,fontWeight:"900"},statLabel:{color:"#475467",fontSize:13,fontWeight:"700",marginTop:4},commandCard:{backgroundColor:"#0A4A35",borderRadius:22,padding:18,marginBottom:28},commandEyebrow:{color:"#EBCB8B",fontSize:10,fontWeight:"900",letterSpacing:1.7},commandTitle:{color:"#FFFFFF",fontSize:22,lineHeight:28,fontWeight:"900",marginTop:7,marginBottom:14},commandInput:{backgroundColor:"#FFFFFF",borderRadius:14,paddingHorizontal:14,paddingVertical:15},commandPlaceholder:{color:"#667085",fontSize:13,lineHeight:19},promptRow:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:12},promptChip:{overflow:"hidden",color:"#D8E9E2",backgroundColor:"#176148",paddingHorizontal:10,paddingVertical:7,borderRadius:999,fontSize:11,fontWeight:"700"},sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:2,marginBottom:12},sectionTitle:{color:"#101828",fontSize:20,fontWeight:"900"},sectionLink:{color:"#0A4A35",fontSize:13,fontWeight:"800"},aiCard:{backgroundColor:"#FFFFFF",borderRadius:18,borderWidth:1,borderColor:"#E4E7EC",padding:17,marginBottom:24},aiEyebrow:{color:"#C58A24",fontSize:10,fontWeight:"900",letterSpacing:1.3},aiTitle:{color:"#101828",fontSize:17,lineHeight:23,fontWeight:"900",marginTop:7},aiBody:{color:"#667085",fontSize:13,lineHeight:20,marginTop:7},aiButton:{marginTop:14,alignSelf:"flex-start",backgroundColor:"#ECF6F1",borderRadius:10,paddingHorizontal:12,paddingVertical:9},aiButtonText:{color:"#0A4A35",fontSize:12,fontWeight:"900"},scheduleCard:{backgroundColor:"#FFFFFF",borderRadius:18,borderWidth:1,borderColor:"#E4E7EC",paddingHorizontal:14,paddingVertical:4},scheduleRow:{flexDirection:"row",alignItems:"center",paddingVertical:14},timeBadge:{width:58,backgroundColor:"#EAF7EF",paddingVertical:8,borderRadius:10,alignItems:"center"},timeBadgeText:{color:"#087443",fontSize:11,fontWeight:"900"},timeBadgeRisk:{backgroundColor:"#FFF6E6"},timeBadgeRiskText:{color:"#B54708"},scheduleCopy:{flex:1,paddingHorizontal:11},scheduleTitle:{color:"#101828",fontSize:13,fontWeight:"800"},scheduleMeta:{color:"#667085",fontSize:12,marginTop:4},covered:{color:"#087443",fontSize:11,fontWeight:"900"},atRisk:{color:"#B42318",fontSize:11,fontWeight:"900"},divider:{height:1,backgroundColor:"#EAECF0"},footerNote:{color:"#98A2B3",textAlign:"center",fontSize:11,marginTop:28},empty:{color:"#667085",fontSize:12,lineHeight:18,paddingVertical:18,textAlign:"center"},error:{backgroundColor:"#FEE4E2",borderRadius:14,padding:13,marginBottom:14},errorTitle:{color:"#B42318",fontWeight:"900"},errorText:{color:"#7A271A",fontSize:12,lineHeight:18,marginTop:4},retry:{alignSelf:"flex-start",backgroundColor:"#B42318",borderRadius:9,paddingHorizontal:11,paddingVertical:8,marginTop:8},retryText:{color:"white",fontWeight:"900",fontSize:11}});
