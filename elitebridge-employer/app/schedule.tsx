import { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { createEmployerShift, fetchEmployerShifts, sharedApiConfigured, type SharedShift } from "../lib/shared-api";

type Shift = {
  id: string;
  client: string;
  service: string;
  time: string;
  location: string;
  status: "Covered" | "Open" | "At risk";
  caregiver?: string;
  remoteId?: number;
};

const emptyDraft = {
  client: "",
  service: "",
  caregiverType: "Caregiver",
  startDate: "",
  startTime: "",
  endTime: "",
  address: "",
  city: "",
  state: "MA",
  zipCode: "",
  hourlyRate: "",
  responsibilities: "Provide the scheduled care service and document the visit.",
  contactName: "Agency Scheduler",
  contactPhone: "",
  urgency: "standard" as "standard" | "urgent",
};

function formatRemoteShift(shift: SharedShift): Shift {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  const date = Number.isNaN(start.getTime()) ? "Scheduled" : start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const startTime = Number.isNaN(start.getTime()) ? "" : start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTime = Number.isNaN(end.getTime()) ? "" : end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const status: Shift["status"] = shift.status === "assigned" ? "Covered" : shift.urgency === "urgent" ? "At risk" : "Open";
  return { id: `remote-${shift.id}`, remoteId: shift.id, client: shift.careRecipientName || "Client", service: shift.serviceType, time: `${date} · ${startTime}–${endTime}`, location: `${shift.location.city}, ${shift.location.state}`, status };
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [refreshing, setRefreshing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(sharedApiConfigured ? "Connecting secure shared schedule…" : "Secure local preview");

  const loadShifts = async () => {
    if (!sharedApiConfigured) return;
    try {
      setRefreshing(true);
      const remote = await fetchEmployerShifts();
      setShifts(remote.map(formatRemoteShift));
      setSyncMessage("Shared with Elite Bridge caregivers");
    } catch (error) {
      setSyncMessage(error instanceof Error ? `Shared sync issue: ${error.message}` : "Shared sync unavailable");
    } finally { setRefreshing(false); }
  };

  useEffect(() => { void loadShifts(); }, []);

  const postShift = async () => {
    const rate = Number(draft.hourlyRate);
    if (!draft.client.trim() || !draft.service.trim() || !draft.startDate.trim() || !draft.startTime.trim() || !draft.endTime.trim()) return Alert.alert("Missing information", "Add the client, service, date, start time and end time.");
    if (!draft.address.trim() || !draft.city.trim() || !draft.zipCode.trim()) return Alert.alert("Missing location", "Add the service address, city and ZIP code.");
    if (!Number.isFinite(rate) || rate <= 0) return Alert.alert("Invalid rate", "Enter a valid hourly rate.");
    if (!draft.contactPhone.trim()) return Alert.alert("Missing contact", "Add the scheduler contact phone number.");

    try {
      if (sharedApiConfigured) {
        const created = await createEmployerShift({ ...draft, hourlyRate: rate });
        setShifts((current) => [formatRemoteShift(created), ...current]);
        setSyncMessage("Posted to the caregiver shift feed");
      } else {
        const local: Shift = { id: String(Date.now()), client: draft.client, service: draft.service, time: `${draft.startDate} · ${draft.startTime}–${draft.endTime}`, location: `${draft.city}, ${draft.state}`, status: draft.urgency === "urgent" ? "At risk" : "Open" };
        setShifts((current) => [local, ...current]);
      }
      setDraft(emptyDraft);
      setShowForm(false);
      Alert.alert("Shift posted", sharedApiConfigured ? "The shift is now available in Elite Bridge for caregivers." : "The shift was saved in this local preview.");
    } catch (error) { Alert.alert("Could not post shift", error instanceof Error ? error.message : "Please try again."); }
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadShifts} />}>
    <View style={styles.headerRow}><View><Text style={styles.eyebrow}>ELITE BRIDGE EMPLOYER</Text><Text style={styles.title}>Schedule</Text></View><TouchableOpacity style={styles.primary} onPress={() => setShowForm(!showForm)}><Text style={styles.primaryText}>{showForm ? "Cancel" : "+ New shift"}</Text></TouchableOpacity></View>
    <Text style={styles.sub}>One schedule for coverage, risk, continuity and overtime.</Text>
    <View style={[styles.syncPill, sharedApiConfigured ? styles.syncPillOn : styles.syncPillOff]}><Text style={styles.syncText}>{syncMessage}</Text></View>

    {showForm && <View style={styles.card}>
      <Text style={styles.cardTitle}>Post a shift</Text>
      <TextInput value={draft.client} onChangeText={(client) => setDraft({ ...draft, client })} placeholder="Client name" style={styles.input} placeholderTextColor="#98A2B3" />
      <TextInput value={draft.service} onChangeText={(service) => setDraft({ ...draft, service })} placeholder="Service, e.g. Personal Care" style={styles.input} placeholderTextColor="#98A2B3" />
      <TextInput value={draft.caregiverType} onChangeText={(caregiverType) => setDraft({ ...draft, caregiverType })} placeholder="Worker type" style={styles.input} placeholderTextColor="#98A2B3" />
      <View style={styles.twoCol}><TextInput value={draft.startDate} onChangeText={(startDate) => setDraft({ ...draft, startDate })} placeholder="YYYY-MM-DD" style={[styles.input, styles.flexInput]} placeholderTextColor="#98A2B3" /><TextInput value={draft.hourlyRate} onChangeText={(hourlyRate) => setDraft({ ...draft, hourlyRate })} placeholder="$ / hr" keyboardType="decimal-pad" style={[styles.input, styles.rateInput]} placeholderTextColor="#98A2B3" /></View>
      <View style={styles.twoCol}><TextInput value={draft.startTime} onChangeText={(startTime) => setDraft({ ...draft, startTime })} placeholder="Start 08:00" style={[styles.input, styles.flexInput]} placeholderTextColor="#98A2B3" /><TextInput value={draft.endTime} onChangeText={(endTime) => setDraft({ ...draft, endTime })} placeholder="End 14:00" style={[styles.input, styles.flexInput]} placeholderTextColor="#98A2B3" /></View>
      <TextInput value={draft.address} onChangeText={(address) => setDraft({ ...draft, address })} placeholder="Service address" style={styles.input} placeholderTextColor="#98A2B3" />
      <View style={styles.twoCol}><TextInput value={draft.city} onChangeText={(city) => setDraft({ ...draft, city })} placeholder="City" style={[styles.input, styles.flexInput]} placeholderTextColor="#98A2B3" /><TextInput value={draft.state} onChangeText={(state) => setDraft({ ...draft, state: state.toUpperCase().slice(0, 2) })} placeholder="MA" maxLength={2} style={[styles.input, styles.stateInput]} placeholderTextColor="#98A2B3" /><TextInput value={draft.zipCode} onChangeText={(zipCode) => setDraft({ ...draft, zipCode })} placeholder="ZIP" keyboardType="number-pad" style={[styles.input, styles.zipInput]} placeholderTextColor="#98A2B3" /></View>
      <TextInput value={draft.responsibilities} onChangeText={(responsibilities) => setDraft({ ...draft, responsibilities })} placeholder="Responsibilities" multiline style={[styles.input, styles.notes]} placeholderTextColor="#98A2B3" />
      <View style={styles.twoCol}><TextInput value={draft.contactName} onChangeText={(contactName) => setDraft({ ...draft, contactName })} placeholder="Scheduler name" style={[styles.input, styles.flexInput]} placeholderTextColor="#98A2B3" /><TextInput value={draft.contactPhone} onChangeText={(contactPhone) => setDraft({ ...draft, contactPhone })} placeholder="Phone" keyboardType="phone-pad" style={[styles.input, styles.flexInput]} placeholderTextColor="#98A2B3" /></View>
      <View style={styles.urgencyRow}><TouchableOpacity onPress={() => setDraft({ ...draft, urgency: "standard" })} style={[styles.urgencyButton, draft.urgency === "standard" && styles.urgencyActive]}><Text style={[styles.urgencyText, draft.urgency === "standard" && styles.urgencyTextActive]}>Standard</Text></TouchableOpacity><TouchableOpacity onPress={() => setDraft({ ...draft, urgency: "urgent" })} style={[styles.urgencyButton, draft.urgency === "urgent" && styles.urgencyRisk]}><Text style={[styles.urgencyText, draft.urgency === "urgent" && styles.urgencyTextActive]}>Urgent coverage</Text></TouchableOpacity></View>
      <TouchableOpacity style={styles.primaryWide} onPress={postShift}><Text style={styles.primaryText}>Post shift</Text></TouchableOpacity>
    </View>}

    <View style={styles.summaryRow}><View style={styles.summary}><Text style={styles.summaryValue}>{shifts.filter(s=>s.status==="Covered").length}</Text><Text style={styles.summaryLabel}>Covered</Text></View><View style={styles.summary}><Text style={styles.summaryValue}>{shifts.filter(s=>s.status!=="Covered").length}</Text><Text style={styles.summaryLabel}>Need attention</Text></View></View>

    {shifts.map((shift) => <View key={shift.id} style={styles.card}><View style={styles.row}><View style={{flex:1}}><Text style={styles.cardTitle}>{shift.service} · {shift.client}</Text><Text style={styles.meta}>{shift.time}</Text><Text style={styles.meta}>{shift.location}{shift.caregiver ? ` · ${shift.caregiver}` : " · Unassigned"}</Text></View><Text style={[styles.status, shift.status==="Covered"?styles.good:shift.status==="At risk"?styles.risk:styles.open]}>{shift.status}</Text></View>{shift.status !== "Covered" && <TouchableOpacity style={styles.secondary} onPress={() => router.push("/coverage")}><Text style={styles.secondaryText}>Run Coverage Copilot</Text></TouchableOpacity>}</View>)}
    {shifts.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>No shifts yet</Text><Text style={styles.meta}>Post the first shift and it will appear in the caregiver app through secure shared sync.</Text></View>}
  </ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:90},headerRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.3,color:"#C58A24"},title:{fontSize:30,fontWeight:"900",color:"#101828",marginTop:4},sub:{color:"#667085",marginTop:6,marginBottom:10,lineHeight:20},syncPill:{alignSelf:"flex-start",borderRadius:999,paddingHorizontal:10,paddingVertical:6,marginBottom:16},syncPillOn:{backgroundColor:"#ECFDF3"},syncPillOff:{backgroundColor:"#F2F4F7"},syncText:{fontSize:11,fontWeight:"800",color:"#0A4A35"},primary:{backgroundColor:"#0A4A35",paddingHorizontal:14,paddingVertical:11,borderRadius:11},primaryWide:{backgroundColor:"#0A4A35",padding:14,borderRadius:11,alignItems:"center",marginTop:4},primaryText:{color:"white",fontWeight:"900"},card:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:16,padding:15,marginBottom:12},cardTitle:{fontSize:16,fontWeight:"900",color:"#101828"},input:{borderWidth:1,borderColor:"#D0D5DD",backgroundColor:"#F9FAFB",borderRadius:10,padding:12,marginTop:10,color:"#101828"},notes:{minHeight:76,textAlignVertical:"top"},twoCol:{flexDirection:"row",gap:8},flexInput:{flex:1},rateInput:{width:100},stateInput:{width:64},zipInput:{width:90},urgencyRow:{flexDirection:"row",gap:8,marginTop:10,marginBottom:10},urgencyButton:{flex:1,borderWidth:1,borderColor:"#D0D5DD",borderRadius:10,padding:11,alignItems:"center"},urgencyActive:{backgroundColor:"#0A4A35",borderColor:"#0A4A35"},urgencyRisk:{backgroundColor:"#B42318",borderColor:"#B42318"},urgencyText:{fontWeight:"800",color:"#475467",fontSize:12},urgencyTextActive:{color:"white"},summaryRow:{flexDirection:"row",gap:10,marginBottom:14},summary:{flex:1,backgroundColor:"#ECF6F1",borderRadius:15,padding:14},summaryValue:{fontSize:26,fontWeight:"900",color:"#0A4A35"},summaryLabel:{color:"#475467",marginTop:2,fontWeight:"700"},row:{flexDirection:"row",alignItems:"flex-start",gap:10},meta:{color:"#667085",fontSize:12,marginTop:4,lineHeight:18},status:{fontSize:11,fontWeight:"900",paddingHorizontal:9,paddingVertical:6,borderRadius:999,overflow:"hidden"},good:{color:"#067647",backgroundColor:"#ECFDF3"},risk:{color:"#B42318",backgroundColor:"#FEF3F2"},open:{color:"#B54708",backgroundColor:"#FFFAEB"},secondary:{marginTop:12,backgroundColor:"#ECF6F1",padding:11,borderRadius:10,alignItems:"center"},secondaryText:{color:"#0A4A35",fontWeight:"900"},empty:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:16,padding:22,alignItems:"center"},emptyTitle:{color:"#101828",fontWeight:"900",fontSize:17}});
