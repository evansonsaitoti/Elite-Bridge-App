import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

type Shift = { id: string; client: string; service: string; time: string; location: string; status: "Covered" | "Open" | "At risk"; caregiver?: string };

const seed: Shift[] = [
  { id: "s1", client: "Robert Davis", service: "Companionship", time: "Today · 3:00 PM–8:00 PM", location: "Lowell", status: "Covered", caregiver: "Sarah Johnson" },
  { id: "s2", client: "Mary Thompson", service: "Personal Care", time: "Today · 7:00 PM–11:00 PM", location: "Dracut", status: "At risk" },
  { id: "s3", client: "Alice Green", service: "Respite Care", time: "Tomorrow · 9:00 AM–1:00 PM", location: "Chelmsford", status: "Open" },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const [shifts, setShifts] = useState(seed);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ client: "", service: "", time: "", location: "" });

  const postShift = () => {
    if (!draft.client.trim() || !draft.service.trim() || !draft.time.trim()) return Alert.alert("Missing information", "Add client, service and time.");
    setShifts([{ id: String(Date.now()), ...draft, status: "Open" }, ...shifts]);
    setDraft({ client: "", service: "", time: "", location: "" });
    setShowForm(false);
    Alert.alert("Shift posted", "Coverage Copilot will watch this shift for fill risk.");
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.headerRow}><View><Text style={styles.eyebrow}>ELITE BRIDGE EMPLOYER</Text><Text style={styles.title}>Schedule</Text></View><TouchableOpacity style={styles.primary} onPress={() => setShowForm(!showForm)}><Text style={styles.primaryText}>{showForm ? "Cancel" : "+ New shift"}</Text></TouchableOpacity></View>
    <Text style={styles.sub}>One schedule for coverage, risk, continuity and overtime.</Text>

    {showForm && <View style={styles.card}><Text style={styles.cardTitle}>Post a shift</Text>{(["client","service","time","location"] as const).map((field) => <TextInput key={field} value={draft[field]} onChangeText={(value) => setDraft({ ...draft, [field]: value })} placeholder={field === "time" ? "Date and time" : field[0].toUpperCase()+field.slice(1)} style={styles.input} placeholderTextColor="#98A2B3" />)}<TouchableOpacity style={styles.primaryWide} onPress={postShift}><Text style={styles.primaryText}>Post shift</Text></TouchableOpacity></View>}

    <View style={styles.summaryRow}><View style={styles.summary}><Text style={styles.summaryValue}>{shifts.filter(s=>s.status==="Covered").length}</Text><Text style={styles.summaryLabel}>Covered</Text></View><View style={styles.summary}><Text style={styles.summaryValue}>{shifts.filter(s=>s.status!=="Covered").length}</Text><Text style={styles.summaryLabel}>Need attention</Text></View></View>

    {shifts.map((shift) => <View key={shift.id} style={styles.card}>
      <View style={styles.row}><View style={{flex:1}}><Text style={styles.cardTitle}>{shift.service} · {shift.client}</Text><Text style={styles.meta}>{shift.time}</Text><Text style={styles.meta}>{shift.location}{shift.caregiver ? ` · ${shift.caregiver}` : " · Unassigned"}</Text></View><Text style={[styles.status, shift.status==="Covered"?styles.good:shift.status==="At risk"?styles.risk:styles.open]}>{shift.status}</Text></View>
      {shift.status !== "Covered" && <TouchableOpacity style={styles.secondary} onPress={() => router.push("/coverage")}><Text style={styles.secondaryText}>Run Coverage Copilot</Text></TouchableOpacity>}
    </View>)}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:"#F7F9F8"},content:{padding:18,paddingBottom:90},headerRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},eyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.3,color:"#C58A24"},title:{fontSize:30,fontWeight:"900",color:"#101828",marginTop:4},sub:{color:"#667085",marginTop:6,marginBottom:18,lineHeight:20},primary:{backgroundColor:"#0A4A35",paddingHorizontal:14,paddingVertical:11,borderRadius:11},primaryWide:{backgroundColor:"#0A4A35",padding:14,borderRadius:11,alignItems:"center"},primaryText:{color:"white",fontWeight:"900"},card:{backgroundColor:"white",borderWidth:1,borderColor:"#E4E7EC",borderRadius:16,padding:15,marginBottom:12},cardTitle:{fontSize:16,fontWeight:"900",color:"#101828"},input:{borderWidth:1,borderColor:"#D0D5DD",backgroundColor:"#F9FAFB",borderRadius:10,padding:12,marginTop:10,color:"#101828"},summaryRow:{flexDirection:"row",gap:10,marginBottom:14},summary:{flex:1,backgroundColor:"#ECF6F1",borderRadius:15,padding:14},summaryValue:{fontSize:26,fontWeight:"900",color:"#0A4A35"},summaryLabel:{color:"#475467",marginTop:2,fontWeight:"700"},row:{flexDirection:"row",alignItems:"flex-start",gap:10},meta:{color:"#667085",fontSize:12,marginTop:4},status:{fontSize:11,fontWeight:"900",paddingHorizontal:9,paddingVertical:6,borderRadius:999,overflow:"hidden"},good:{color:"#067647",backgroundColor:"#ECFDF3"},risk:{color:"#B42318",backgroundColor:"#FEF3F2"},open:{color:"#B54708",backgroundColor:"#FFFAEB"},secondary:{marginTop:12,backgroundColor:"#ECF6F1",padding:11,borderRadius:10,alignItems:"center"},secondaryText:{color:"#0A4A35",fontWeight:"900"}});
