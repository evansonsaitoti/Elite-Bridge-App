import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { createEmployerShift, getEmployerClientLocations, getStoredEmployer, type EmployerClientLocation, type ShiftInput } from "../lib/api";
import { colors } from "../lib/theme";

function addDays(date: string, offset: number) {
  const d = new Date(date + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
function validTime(value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  return true;
}
export default function ClientScheduleScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const [clients, setClients] = useState<EmployerClientLocation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState("4");
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(true);
  const [morningStart, setMorningStart] = useState("");
  const [morningEnd, setMorningEnd] = useState("");
  const [eveningStart, setEveningStart] = useState("");
  const [eveningEnd, setEveningEnd] = useState("");
  const [serviceType, setServiceType] = useState("Personal care");
  const [caregiverType, setCaregiverType] = useState("Caregiver");
  const [responsibilities, setResponsibilities] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"instant"|"review">("review");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [confirmedPartial, setConfirmedPartial] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      try {
        if (!await getStoredEmployer()) { router.replace("/sign-in"); return; }
        const list = await getEmployerClientLocations();
        if (active) {
          setClients(list);
          const target = list.find(c => String(c.id) === clientId);
          setSelected(current => current && list.some(c => c.id === current) ? current : target?.id ?? null);
          if (target) setContactPhone(target.contactPhone);
          setLoadError("");
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load your clients.");
      }
    })();
    return () => { active = false; };
  }, [clientId, router]));

  const client = clients.find(c => c.id === selected);
  const numberDays = Number(days);
  const preview = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(numberDays) || numberDays < 1 || numberDays > 7) return [];
    const list: { date: string; startTime: string; endTime: string; label: string }[] = [];
    for (let i = 0; i < numberDays; i++) {
      const date = addDays(startDate, i);
      if (morning) list.push({ date, startTime: morningStart, endTime: morningEnd, label: "First visit" });
      if (evening) list.push({ date, startTime: eveningStart, endTime: eveningEnd, label: "Second visit" });
    }
    return list;
  }, [startDate,numberDays,morning,evening,morningStart,morningEnd,eveningStart,eveningEnd]);

  const postSchedule = () => {
    if (busy || confirmedPartial) return;
    if (!client) { Alert.alert("Choose a client", "Select a saved client location first."); return; }
    if (!preview.length || preview.some(v => !validTime(v.startTime) || !validTime(v.endTime) || v.startTime >= v.endTime)) {
      Alert.alert("Check schedule", "Enter the first date, 1–7 days, and valid start/end times for the visit windows. Times must be same-day and end after start.");
      return;
    }
    if (!client.address.trim() || !client.contactName.trim() || !/^[+()0-9 .-]{7,40}$/.test(contactPhone.trim())) {
      Alert.alert("Contact details required", "A saved street address, on-site contact name, and valid on-site phone are required before publishing. Update the client record or enter a phone number here.");
      return;
    }
    if (!serviceType.trim() || !caregiverType.trim() || !responsibilities.trim()) {
      Alert.alert("Care details required", "Enter the service, caregiver qualification and responsibilities.");
      return;
    }
    Alert.alert("Publish care schedule?", `Create ${preview.length} shifts for ${client.clientName} at ${client.locationName}, using the saved caregiver pay rate of $${client.caregiverRate.toFixed(2)}/hr? Each shift is published separately; do not post the same schedule twice.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Publish", onPress: () => void submit(client, preview) },
    ]);
  };

  const submit = async (location: EmployerClientLocation, rows: typeof preview) => {
    if (busy) return;
    setBusy(true);
    let created = 0;
    try {
      for (const visit of rows) {
        const draft: ShiftInput = {
          careRecipientName: location.clientName, serviceType: serviceType.trim(),
          caregiverType: caregiverType.trim(), startDate: visit.date, timeZone: "America/New_York",
          numberOfCaregivers: 1, startTime: visit.startTime, endTime: visit.endTime,
          address: location.address, city: location.city, state: location.state, zipCode: location.zipCode,
          // Public shift pay must use caregiver rate, never the private client billing rate.
          hourlyRate: location.caregiverRate, responsibilities: responsibilities.trim(),
          contactName: location.contactName || location.clientName, contactPhone: contactPhone.trim(),
          urgency: "standard", assignmentMode,
        };
        await createEmployerShift(draft);
        created++;
      }
      Alert.alert("Schedule published", `${created} shifts were created for ${location.clientName}.`, [
        { text: "View shifts", onPress: () => router.replace("/shifts") },
      ]);
      setConfirmedPartial(true);
    } catch (error) {
      if (created) setConfirmedPartial(true);
      Alert.alert("Schedule only partially created", `${created} of ${rows.length} shifts were created. ${error instanceof Error ? error.message : "The remaining visits failed."} Review posted shifts before adding any missing visits to avoid duplicates.`, [
        { text: "Review shifts", onPress: () => router.replace("/shifts") },
      ]);
    } finally { setBusy(false); }
  };

  const field=(label:string,value:string,onChangeText:(v:string)=>void,keyboardType:"default"|"numbers-and-punctuation"|"number-pad"="default") =>
    <View style={{ marginTop: 12 }}><Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} autoCorrect={false} keyboardType={keyboardType}
        value={value} onChangeText={onChangeText} placeholderTextColor="#82918A" style={styles.input} />
    </View>;

  return <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Text style={styles.title}>Client schedule</Text>
        <Text style={styles.subtitle}>Create verified visits for a client already saved in your employer account.</Text>
        {loadError ? <Text accessibilityRole="alert" style={styles.error}>{loadError}</Text> : null}
        {!clients.length && !loadError ? <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/clients")} style={styles.secondary}>
          <Text style={styles.secondaryText}>Add a client record first →</Text>
        </TouchableOpacity> : null}
        <Text style={styles.heading}>Choose client</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {clients.map(c => <TouchableOpacity key={c.id} accessibilityRole="button" onPress={() => { setSelected(c.id); setContactPhone(c.contactPhone); setConfirmedPartial(false); }}
            style={[styles.choice, selected === c.id && styles.choiceSelected]}>
            <Text style={{ color: selected === c.id ? "#FFF" : colors.green, fontWeight: "900" }}>{c.clientName}</Text>
            <Text style={{ color: selected === c.id ? "#DCF0E3" : colors.muted, fontSize: 11 }}>{c.locationName} · {c.city}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        {client ? <View style={styles.client}>
          <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 19 }}>{client.clientName}</Text>
          <Text style={{ color: "#CEE9DC", fontSize: 12, marginTop: 6 }}>{client.locationName} · {client.city}, {client.state}</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 12, marginTop: 7 }}>Caregiver pay: ${client.caregiverRate.toFixed(2)}/hr</Text>
        </View> : null}
        {field("On-site contact phone",contactPhone,setContactPhone)}
        <Text style={styles.heading}>Visit windows</Text>
        {field("First visit date (YYYY-MM-DD)",startDate,setStartDate,"numbers-and-punctuation")}
        {field("Consecutive days (1–7)",days,setDays,"number-pad")}
        <View style={styles.toggle}><Text style={styles.toggleText}>First daily visit</Text><Switch value={morning} onValueChange={setMorning}/></View>
        {morning ? <View style={styles.pair}>{field("Start (HH:MM)",morningStart,setMorningStart,"numbers-and-punctuation")}{field("End (HH:MM)",morningEnd,setMorningEnd,"numbers-and-punctuation")}</View> : null}
        <View style={styles.toggle}><Text style={styles.toggleText}>Second daily visit</Text><Switch value={evening} onValueChange={setEvening}/></View>
        {evening ? <View style={styles.pair}>{field("Start (HH:MM)",eveningStart,setEveningStart,"numbers-and-punctuation")}{field("End (HH:MM)",eveningEnd,setEveningEnd,"numbers-and-punctuation")}</View> : null}
        <Text style={styles.heading}>Care requirements</Text>
        {field("Service",serviceType,setServiceType)}
        {field("Caregiver type",caregiverType,setCaregiverType)}
        {field("Responsibilities",responsibilities,setResponsibilities)}
        <Text style={styles.heading}>Caregiver response</Text>
        <View style={styles.pair}>
          {(["review","instant"] as const).map(mode => <TouchableOpacity key={mode} accessibilityRole="button" onPress={() => setAssignmentMode(mode)}
            style={[styles.mode,assignmentMode===mode&&styles.choiceSelected]}>
            <Text style={{ fontWeight: "900", color: assignmentMode===mode?"#FFF":colors.green }}>{mode==="review"?"Review first":"Instant claim"}</Text>
          </TouchableOpacity>)}
        </View>
        <Text style={styles.heading}>Review before posting ({preview.length} visits)</Text>
        {preview.length ? preview.map((visit,i) => <View key={visit.date+visit.label+i} style={styles.visit}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>{visit.date} · {visit.label}</Text>
          <Text style={{ color: colors.muted, marginTop: 3 }}>{visit.startTime || "Start?"} – {visit.endTime || "End?"}</Text>
        </View>) : <Text style={styles.subtitle}>Choose a date and visit windows to see a preview.</Text>}
        {confirmedPartial ? <Text style={styles.error}>This schedule was already submitted or partially submitted. Review existing shifts before creating more.</Text> : null}
        <TouchableOpacity accessibilityRole="button" disabled={busy||confirmedPartial} onPress={postSchedule} style={[styles.primary,(busy||confirmedPartial)&&{opacity:0.55}]}>
          {busy ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryText}>Review and publish {preview.length} visits</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
  title:{fontSize:27,fontWeight:"900",color:colors.ink},subtitle:{fontSize:12,color:colors.muted,lineHeight:19,marginTop:6},
  error:{color:"#A3332D",padding:13,borderRadius:11,backgroundColor:"#FFF1ED",marginTop:12},
  heading:{fontSize:18,fontWeight:"900",color:colors.ink,marginTop:21,marginBottom:10},
  label:{fontWeight:"800",fontSize:12,color:colors.ink,marginBottom:6},input:{borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.card,minHeight:48,paddingHorizontal:12,color:colors.ink},
  secondary:{backgroundColor:colors.greenSoft,borderRadius:14,padding:15,marginTop:13},secondaryText:{fontWeight:"900",color:colors.green},
  choice:{borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,padding:12,minWidth:135},choiceSelected:{backgroundColor:colors.green,borderColor:colors.green},
  client:{backgroundColor:colors.greenDark,padding:18,borderRadius:18,marginTop:15},
  toggle:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:colors.card,borderRadius:14,borderWidth:1,borderColor:colors.border,marginTop:12,padding:13},
  toggleText:{fontWeight:"800",fontSize:14,color:colors.ink},
  pair:{flexDirection:"row",gap:10},mode:{flex:1,minHeight:47,alignItems:"center",justifyContent:"center",borderRadius:12,borderColor:colors.border,borderWidth:1,backgroundColor:colors.card},
  visit:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,borderRadius:12,padding:12,marginBottom:7},
  primary:{backgroundColor:colors.green,borderRadius:14,alignItems:"center",justifyContent:"center",marginTop:22,minHeight:52},primaryText:{fontWeight:"900",fontSize:15,color:"#FFF"},
});
