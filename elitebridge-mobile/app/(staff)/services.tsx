import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type RequestItem = { id: string; type: "Time Off" | "Shift Swap" | "Message" | "Document"; title: string; detail: string; status: string };
type StaffData = { availability: string; weeklyHours: number; earnings: number; requests: RequestItem[]; visitNotes: string[]; clockedIn: boolean };

const STORAGE_KEY = "elitebridge-staff-services-v1";
const seed: StaffData = {
  availability: "Mon–Fri, 7:00 AM–8:00 PM",
  weeklyHours: 31.5,
  earnings: 1102.5,
  clockedIn: false,
  requests: [
    { id: "q1", type: "Shift Swap", title: "Jul 30 evening shift", detail: "Requested swap with Michael Brown", status: "Pending" },
    { id: "q2", type: "Document", title: "CPR certificate", detail: "Verified through Dec 2027", status: "Approved" },
  ],
  visitNotes: ["Mary Thompson: meal preparation and companionship completed."],
};

export default function StaffServicesScreen() {
  const colors = useColors();
  const [data, setData] = useState(seed);
  const [tab, setTab] = useState<"Clock" | "Requests" | "Notes" | "Profile">("Clock");
  const [draft, setDraft] = useState({ type: "Time Off" as RequestItem["type"], title: "", detail: "" });
  const [note, setNote] = useState("");
  const [availability, setAvailability] = useState(seed.availability);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try { const parsed = JSON.parse(saved) as StaffData; setData(parsed); setAvailability(parsed.availability); } catch { /* keep seed */ }
    });
  }, []);

  const persist = (next: StaffData) => { setData(next); AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined); };
  const input = { borderWidth: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 } as const;
  const card = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12 } as const;
  const button = { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" as const };

  const submitRequest = () => {
    if (!draft.title.trim() || !draft.detail.trim()) return Alert.alert("Missing information", "Enter a title and details.");
    persist({ ...data, requests: [{ id: `q-${Date.now()}`, ...draft, status: "Pending" }, ...data.requests] });
    setDraft({ type: "Time Off", title: "", detail: "" });
    Alert.alert("Request submitted", "The agency can now review it.");
  };

  const saveNote = () => {
    if (!note.trim()) return Alert.alert("Visit note required");
    persist({ ...data, visitNotes: [note.trim(), ...data.visitNotes] });
    setNote("");
    Alert.alert("Visit note saved");
  };

  const toggleClock = () => {
    const next = !data.clockedIn;
    persist({ ...data, clockedIn: next });
    Alert.alert(next ? "Clocked in" : "Clocked out", next ? "Location verification recorded." : "Your visit time was saved for timesheet review.");
  };

  return <ScreenContainer><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
    <Text style={{ fontSize: 28, fontWeight: "900", color: colors.foreground }}>My Services</Text>
    <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 16 }}>Clocking, requests, notes and profile</Text>

    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
      {(["Clock", "Requests", "Notes", "Profile"] as const).map((item) => <TouchableOpacity key={item} onPress={() => setTab(item)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: tab === item ? colors.primary : colors.surface, borderWidth: 1, borderColor: tab === item ? colors.primary : colors.border }}><Text style={{ color: tab === item ? "white" : colors.foreground, fontWeight: "800" }}>{item}</Text></TouchableOpacity>)}
    </View>

    {tab === "Clock" && <>
      <View style={card}><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Today’s Shift</Text><Text style={{ color: colors.muted, marginTop: 6 }}>Mary Thompson • Personal Care</Text><Text style={{ color: colors.muted }}>8:00 AM–2:00 PM • Lowell, MA</Text><View style={{ marginTop: 18, padding: 12, borderRadius: 10, backgroundColor: data.clockedIn ? "#E8F5E9" : colors.background }}><Text style={{ color: data.clockedIn ? "#1B5E20" : colors.muted, fontWeight: "900" }}>{data.clockedIn ? "CLOCKED IN" : "NOT CLOCKED IN"}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Location verification: available at clock actions</Text></View><TouchableOpacity style={[button, { marginTop: 14, backgroundColor: data.clockedIn ? "#B42318" : colors.primary }]} onPress={toggleClock}><Text style={{ color: "white", fontWeight: "900" }}>{data.clockedIn ? "Clock Out" : "Clock In"}</Text></TouchableOpacity></View>
      <View style={{ flexDirection: "row", gap: 10 }}><View style={[card, { flex: 1 }]}><Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>{data.weeklyHours}</Text><Text style={{ color: colors.muted }}>Weekly hours</Text></View><View style={[card, { flex: 1 }]}><Text style={{ color: colors.primary, fontSize: 26, fontWeight: "900" }}>${data.earnings.toLocaleString("en-US")}</Text><Text style={{ color: colors.muted }}>Estimated earnings</Text></View></View>
    </>}

    {tab === "Requests" && <>
      <View style={card}><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", marginBottom: 12 }}>New request</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{(["Time Off", "Shift Swap", "Message", "Document"] as RequestItem["type"][]).map((type) => <TouchableOpacity key={type} onPress={() => setDraft({ ...draft, type })} style={{ padding: 8, borderRadius: 8, backgroundColor: draft.type === type ? colors.primary : colors.background, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: draft.type === type ? "white" : colors.foreground, fontWeight: "700" }}>{type}</Text></TouchableOpacity>)}</View><TextInput placeholder="Title" placeholderTextColor={colors.muted} value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} style={input} /><TextInput placeholder="Details" placeholderTextColor={colors.muted} multiline value={draft.detail} onChangeText={(detail) => setDraft({ ...draft, detail })} style={[input, { minHeight: 90, textAlignVertical: "top" }]} /><TouchableOpacity style={button} onPress={submitRequest}><Text style={{ color: "white", fontWeight: "800" }}>Submit Request</Text></TouchableOpacity></View>
      {data.requests.map((item) => <View key={item.id} style={card}><Text style={{ color: colors.primary, fontWeight: "900" }}>{item.type}</Text><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800", marginTop: 4 }}>{item.title}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>{item.detail}</Text><Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 8 }}>{item.status}</Text></View>)}
    </>}

    {tab === "Notes" && <><View style={card}><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", marginBottom: 10 }}>Visit documentation</Text><TextInput placeholder="Describe care provided, client condition and follow-up" placeholderTextColor={colors.muted} multiline value={note} onChangeText={setNote} style={[input, { minHeight: 120, textAlignVertical: "top" }]} /><TouchableOpacity style={button} onPress={saveNote}><Text style={{ color: "white", fontWeight: "800" }}>Save Visit Note</Text></TouchableOpacity></View>{data.visitNotes.map((item, index) => <View key={`${item}-${index}`} style={card}><Text style={{ color: colors.foreground, lineHeight: 21 }}>{item}</Text><Text style={{ color: colors.muted, marginTop: 7 }}>Submitted for administrator review</Text></View>)}</>}

    {tab === "Profile" && <View style={card}><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Sarah Johnson</Text><Text style={{ color: colors.muted, marginTop: 5 }}>Caregiver • Active</Text><Text style={{ color: colors.foreground, fontWeight: "800", marginTop: 18, marginBottom: 7 }}>Availability</Text><TextInput value={availability} onChangeText={setAvailability} style={input} /><TouchableOpacity style={button} onPress={() => { persist({ ...data, availability: availability.trim() || data.availability }); Alert.alert("Profile updated"); }}><Text style={{ color: "white", fontWeight: "800" }}>Save Availability</Text></TouchableOpacity><View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}><Text style={{ color: colors.foreground, fontWeight: "800" }}>Documents</Text><Text style={{ color: colors.muted, marginTop: 5 }}>CPR certificate • Verified</Text><Text style={{ color: colors.muted }}>Background check • Cleared</Text></View></View>}
  </ScrollView></ScreenContainer>;
}
