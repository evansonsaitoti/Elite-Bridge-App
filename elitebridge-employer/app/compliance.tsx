import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getAgencyProfile, getComplianceState, saveComplianceState, type AgencyProfile } from "../lib/employer-storage";

type Status = "open" | "reviewing" | "resolved";
type Item = {
  id: string;
  priority: "High" | "Medium" | "Low";
  title: string;
  signal: string;
  why: string;
  next: string;
  applies: (profile: AgencyProfile | null) => boolean;
};

const ITEMS: Item[] = [
  {
    id: "credential-monitoring",
    priority: "High",
    title: "Confirm credential-monitoring rules",
    signal: "Agency policy review",
    why: "Caregiver qualifications and document-expiration rules can vary by service, payer, contract and agency policy.",
    next: "Document which credentials are required for each service type and who verifies them before assignment.",
    applies: () => true,
  },
  {
    id: "job-order",
    priority: "High",
    title: "Temporary-worker job-order process",
    signal: "Applies when your agency operates as a staffing agency",
    why: "Massachusetts staffing agencies may need to provide temporary workers written assignment information before a job, subject to exceptions.",
    next: "Review the Massachusetts temporary-worker notice requirements and configure an agency-approved job-order template before using automated notices.",
    applies: (profile) => profile?.agencyType === "Staffing Agency",
  },
  {
    id: "sick-time",
    priority: "Medium",
    title: "Earned sick-time process",
    signal: "Payroll and timekeeping checklist",
    why: "Massachusetts earned sick-time rules apply broadly, including to many part-time and temporary employees; employer size affects whether accrued time is paid.",
    next: "Confirm your payroll system, accrual method and worker policy align with the current Massachusetts requirements that apply to your workforce.",
    applies: () => true,
  },
  {
    id: "evv-readiness",
    priority: "High",
    title: "EVV applicability and workflow",
    signal: "Medicaid / visit-verification profile",
    why: "EVV applies to certain Medicaid-funded in-home personal care and home-health services. Your agency profile indicates EVV may be relevant.",
    next: "Confirm payer and program requirements, map applicable service codes and validate your visit-verification workflow before relying on EVV automation.",
    applies: (profile) => Boolean(profile?.medicaidPrograms || profile?.evvRequired),
  },
  {
    id: "registry-review",
    priority: "Medium",
    title: "Home Care Worker Registry applicability",
    signal: "Home-care program checklist",
    why: "The Massachusetts Home Care Worker Registry applies to specified workers and agencies participating in the State Home Care Program.",
    next: "Confirm whether your contracts and workforce fall within the registry program before creating any reporting or onboarding requirement.",
    applies: (profile) => profile?.agencyType === "Home Care Agency",
  },
  {
    id: "worker-ack",
    priority: "Low",
    title: "Worker policy acknowledgments",
    signal: "Onboarding governance checklist",
    why: "Agencies commonly maintain signed acknowledgments for policies, handbooks and required onboarding documents.",
    next: "Define the acknowledgments your agency requires and the retention process before enabling automated reminders.",
    applies: () => true,
  },
];

export default function ComplianceCopilot() {
  const router = useRouter();
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [filter, setFilter] = useState<"All" | "Open" | "Resolved">("All");

  useEffect(() => {
    Promise.all([getAgencyProfile(), getComplianceState()]).then(([agency, state]) => {
      setProfile(agency);
      setStatuses(state);
    });
  }, []);

  const items = useMemo(() => ITEMS.filter((item) => item.applies(profile)).filter((item) => {
    const status = statuses[item.id] ?? "open";
    if (filter === "Open") return status !== "resolved";
    if (filter === "Resolved") return status === "resolved";
    return true;
  }), [profile, statuses, filter]);

  const openCount = ITEMS.filter((item) => item.applies(profile) && (statuses[item.id] ?? "open") !== "resolved").length;
  const highCount = ITEMS.filter((item) => item.applies(profile) && item.priority === "High" && (statuses[item.id] ?? "open") !== "resolved").length;

  const setStatus = async (id: string, status: Status) => {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    await saveComplianceState(next);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}><TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity><View style={styles.badge}><Text style={styles.badgeText}>COMPLIANCE COPILOT</Text></View></View>
        <Text style={styles.title}>Compliance Copilot</Text>
        <Text style={styles.sub}>A prioritized agency checklist that turns region-specific operational rules into reviewable tasks. Elite flags areas to verify; your agency makes the final compliance decision.</Text>

        <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{openCount}</Text><Text style={styles.statLabel}>Need review</Text></View><View style={[styles.stat,{backgroundColor:"#FEF3F2"}]}><Text style={[styles.statValue,{color:"#B42318"}]}>{highCount}</Text><Text style={styles.statLabel}>High priority</Text></View></View>

        <View style={styles.aiCard}>
          <Text style={styles.aiEyebrow}>PROFILE-AWARE SUMMARY</Text>
          <Text style={styles.aiTitle}>{highCount ? `${highCount} high-priority checklist item${highCount === 1 ? "" : "s"} should be verified for this agency profile.` : "No high-priority checklist items are open."}</Text>
          <Text style={styles.aiBody}>Agency profile: {profile?.agencyName ?? "Not configured"} · {profile?.agencyType ?? "Unknown type"} · {profile?.city ?? "City not configured"}{profile?.state ? `, ${profile.state}` : ""}</Text>
          <TouchableOpacity onPress={() => router.push("/setup")} style={styles.aiAction}><Text style={styles.aiActionText}>Edit agency profile</Text></TouchableOpacity>
        </View>

        <View style={styles.filters}>{(["All","Open","Resolved"] as const).map((value) => <TouchableOpacity key={value} onPress={() => setFilter(value)} style={[styles.filter, filter===value && styles.filterActive]}><Text style={[styles.filterText, filter===value && styles.filterTextActive]}>{value}</Text></TouchableOpacity>)}</View>

        {items.map((item) => {
          const status = statuses[item.id] ?? "open";
          return <View key={item.id} style={[styles.card, status === "resolved" && { opacity: 0.65 }]}>
            <View style={styles.cardTop}><View style={[styles.priority, item.priority === "High" ? styles.high : item.priority === "Medium" ? styles.medium : styles.low]}><Text style={[styles.priorityText, item.priority === "High" ? {color:"#B42318"} : item.priority === "Medium" ? {color:"#B54708"}:{color:"#475467"}]}>{item.priority}</Text></View><Text style={styles.status}>{status === "open" ? "Needs review" : status === "reviewing" ? "In review" : "Resolved"}</Text></View>
            <Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.signal}>{item.signal}</Text>
            <Text style={styles.heading}>Why Elite surfaced it</Text><Text style={styles.body}>{item.why}</Text>
            <Text style={styles.heading}>Recommended next step</Text><Text style={styles.body}>{item.next}</Text>
            {status !== "resolved" ? <View style={styles.actions}><TouchableOpacity style={styles.secondary} onPress={() => setStatus(item.id,"reviewing")}><Text style={styles.secondaryText}>Mark reviewing</Text></TouchableOpacity><TouchableOpacity style={styles.primary} onPress={() => { void setStatus(item.id,"resolved"); Alert.alert("Marked resolved", "The checklist item remains available and can be reopened."); }}><Text style={styles.primaryText}>Resolve</Text></TouchableOpacity></View> : <TouchableOpacity style={styles.secondaryWide} onPress={() => setStatus(item.id,"open")}><Text style={styles.secondaryText}>Reopen item</Text></TouchableOpacity>}
          </View>;
        })}

        <View style={styles.disclaimer}><Text style={styles.disclaimerTitle}>Decision support, not legal advice</Text><Text style={styles.disclaimerText}>Compliance Copilot surfaces operational checklists and profile-dependent considerations for human review. It is not a substitute for agency counsel, regulator guidance, payer requirements or program-specific rules.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:48},topRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},back:{color:"#0A4A35",fontWeight:"900",fontSize:15},badge:{backgroundColor:"#EAF4EF",paddingHorizontal:10,paddingVertical:6,borderRadius:999},badgeText:{color:"#0A4A35",fontSize:10,fontWeight:"900",letterSpacing:1},title:{color:"#101828",fontSize:30,fontWeight:"900",marginTop:18},sub:{color:"#667085",lineHeight:21,marginTop:7,marginBottom:16},stats:{flexDirection:"row",gap:10,marginBottom:14},stat:{flex:1,backgroundColor:"#ECFDF3",borderRadius:16,padding:14},statValue:{fontSize:27,fontWeight:"900",color:"#067647"},statLabel:{color:"#475467",fontWeight:"700",marginTop:2},aiCard:{backgroundColor:"#0A4A35",borderRadius:18,padding:16,marginBottom:14},aiEyebrow:{color:"#EBCB8B",fontWeight:"900",fontSize:10,letterSpacing:1.4},aiTitle:{color:"white",fontWeight:"900",fontSize:18,lineHeight:24,marginTop:7},aiBody:{color:"#D8E9E2",lineHeight:19,marginTop:7,fontSize:12},aiAction:{alignSelf:"flex-start",marginTop:12,backgroundColor:"#176148",borderRadius:9,paddingHorizontal:11,paddingVertical:8},aiActionText:{color:"white",fontWeight:"800",fontSize:12},filters:{flexDirection:"row",gap:8,marginBottom:12},filter:{paddingHorizontal:12,paddingVertical:8,borderRadius:999,borderWidth:1,borderColor:"#D0D5DD",backgroundColor:"white"},filterActive:{backgroundColor:"#EAF4EF",borderColor:"#0A4A35"},filterText:{color:"#475467",fontWeight:"700",fontSize:12},filterTextActive:{color:"#0A4A35"},card:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:18,padding:16,marginBottom:12},cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},priority:{paddingHorizontal:9,paddingVertical:5,borderRadius:999},high:{backgroundColor:"#FEF3F2"},medium:{backgroundColor:"#FFFAEB"},low:{backgroundColor:"#F2F4F7"},priorityText:{fontWeight:"900",fontSize:10},status:{color:"#667085",fontWeight:"800",fontSize:11},cardTitle:{color:"#101828",fontWeight:"900",fontSize:18,marginTop:10},signal:{color:"#C58A24",fontWeight:"800",marginTop:4},heading:{color:"#344054",fontWeight:"900",fontSize:12,marginTop:13},body:{color:"#667085",lineHeight:20,marginTop:4},actions:{flexDirection:"row",gap:8,marginTop:14},secondary:{flex:1,borderWidth:1,borderColor:"#0A4A35",borderRadius:10,padding:11,alignItems:"center"},secondaryWide:{marginTop:14,borderWidth:1,borderColor:"#0A4A35",borderRadius:10,padding:11,alignItems:"center"},secondaryText:{color:"#0A4A35",fontWeight:"900"},primary:{flex:1,backgroundColor:"#0A4A35",borderRadius:10,padding:11,alignItems:"center"},primaryText:{color:"white",fontWeight:"900"},disclaimer:{backgroundColor:"#FFF8E7",borderRadius:16,padding:14,marginTop:5},disclaimerTitle:{color:"#7A4B00",fontWeight:"900"},disclaimerText:{color:"#7A5A20",fontSize:12,lineHeight:18,marginTop:5},
});
