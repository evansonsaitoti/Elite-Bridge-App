import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { createEmployerShift, ShiftInput } from "../lib/api";
import { colors } from "../lib/theme";

const initial: Record<Exclude<keyof ShiftInput, "hourlyRate" | "urgency" | "assignmentMode">, string> = {
  careRecipientName: "", serviceType: "", caregiverType: "", startDate: "", startTime: "", endTime: "", address: "", city: "", state: "", zipCode: "", responsibilities: "", contactName: "", contactPhone: "",
};

export default function PostShiftScreen() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [rate, setRate] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<"instant" | "review">("instant");
  const [busy, setBusy] = useState(false);
  const set = (field: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    if (Object.values(form).some((value) => !value.trim()) || !rate.trim()) return Alert.alert("Complete the shift", "Every field is required so caregivers can evaluate the opportunity.");
    const hourlyRate = Number(rate);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return Alert.alert("Check hourly rate", "Enter a valid hourly rate.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate) || !/^\d{2}:\d{2}$/.test(form.startTime) || !/^\d{2}:\d{2}$/.test(form.endTime)) return Alert.alert("Check date and time", "Use YYYY-MM-DD for the date and 24-hour HH:MM for times.");
    setBusy(true);
    try {
      const result = await createEmployerShift({ ...form, hourlyRate, urgency: urgent ? "urgent" : "standard", assignmentMode });
      const action = assignmentMode === "instant" ? "claim it immediately" : "apply for your review";
      Alert.alert("Shift offer sent", `${result.matchedCaregivers} currently eligible caregiver${result.matchedCaregivers === 1 ? "" : "s"} matched. They can ${action} in Elite Bridge Caregiver.`, [{ text: "View shifts", onPress: () => router.replace("/shifts") }]);
    } catch (error) {
      Alert.alert("Shift could not be posted", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.notice}><Text style={styles.noticeTitle}>Published to the Caregiver app</Text><Text style={styles.noticeBody}>Caregivers see the schedule, location, pay and responsibilities you enter below.</Text></View>
          <Field label="Care recipient or assignment name" placeholder="Example: Evening companion visit" value={form.careRecipientName} onChangeText={(v) => set("careRecipientName", v)} />
          <Field label="Service" placeholder="Companionship, personal care…" value={form.serviceType} onChangeText={(v) => set("serviceType", v)} />
          <Field label="Caregiver qualification" placeholder="PCA, HHA, CNA…" value={form.caregiverType} onChangeText={(v) => set("caregiverType", v)} />
          <Text style={styles.section}>Schedule</Text>
          <Field label="Date" helper="YYYY-MM-DD" placeholder="2026-09-15" keyboardType="numbers-and-punctuation" value={form.startDate} onChangeText={(v) => set("startDate", v)} />
          <View style={styles.double}><View style={styles.half}><Field label="Start" helper="24-hour HH:MM" placeholder="09:00" keyboardType="numbers-and-punctuation" value={form.startTime} onChangeText={(v) => set("startTime", v)} /></View><View style={styles.half}><Field label="End" helper="24-hour HH:MM" placeholder="17:00" keyboardType="numbers-and-punctuation" value={form.endTime} onChangeText={(v) => set("endTime", v)} /></View></View>
          <Text style={styles.section}>Location and pay</Text>
          <Field label="Street address" placeholder="Care location" value={form.address} onChangeText={(v) => set("address", v)} />
          <Field label="City" placeholder="City" value={form.city} onChangeText={(v) => set("city", v)} />
          <View style={styles.double}><View style={styles.half}><Field label="State" placeholder="MA" autoCapitalize="characters" maxLength={2} value={form.state} onChangeText={(v) => set("state", v)} /></View><View style={styles.half}><Field label="ZIP code" placeholder="01852" keyboardType="number-pad" value={form.zipCode} onChangeText={(v) => set("zipCode", v)} /></View></View>
          <Field label="Hourly rate" placeholder="35.00" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
          <Text style={styles.section}>Assignment details</Text>
          <Field label="Responsibilities" placeholder="Describe the care tasks and expectations" multiline numberOfLines={4} style={styles.multiline} value={form.responsibilities} onChangeText={(v) => set("responsibilities", v)} />
          <Field label="On-site contact name" placeholder="Contact name" value={form.contactName} onChangeText={(v) => set("contactName", v)} />
          <Field label="On-site contact phone" placeholder="Phone number" keyboardType="phone-pad" value={form.contactPhone} onChangeText={(v) => set("contactPhone", v)} />
          <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>Urgent coverage</Text><Text style={styles.switchBody}>Clearly marks the opportunity as urgent for caregivers.</Text></View><Switch onValueChange={setUrgent} trackColor={{ false: colors.border, true: "#76B99C" }} thumbColor={urgent ? colors.green : "#FFFFFF"} value={urgent} /></View>
          <Text style={styles.section}>How caregivers respond</Text>
          <View style={styles.modeRow}><TouchableOpacity onPress={() => setAssignmentMode("instant")} style={[styles.mode, assignmentMode === "instant" && styles.modeActive]}><Text style={[styles.modeTitle, assignmentMode === "instant" && styles.modeTitleActive]}>Instant claim</Text><Text style={[styles.modeBody, assignmentMode === "instant" && styles.modeBodyActive]}>First eligible caregiver to accept is assigned.</Text></TouchableOpacity><TouchableOpacity onPress={() => setAssignmentMode("review")} style={[styles.mode, assignmentMode === "review" && styles.modeActive]}><Text style={[styles.modeTitle, assignmentMode === "review" && styles.modeTitleActive]}>Review first</Text><Text style={[styles.modeBody, assignmentMode === "review" && styles.modeBodyActive]}>Caregivers apply; you select one.</Text></TouchableOpacity></View>
          <View style={styles.delivery}><Text style={styles.deliveryTitle}>Sent as a matched Shift Offer</Text><Text style={styles.deliveryBody}>Only active, available caregivers whose profile meets the role or service criteria can see this opportunity. Eligible caregivers receive a push notification.</Text></View>
          <TouchableOpacity disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Publish and notify matches</Text>}</TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, helper, style, ...props }: { label: string; helper?: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} autoCorrect={false} placeholderTextColor="#8A9790" style={[styles.input, style]} />{helper ? <Text style={styles.helper}>{helper}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 }, content: { padding: 20, paddingBottom: 44 }, notice: { backgroundColor: colors.greenSoft, borderRadius: 15, marginBottom: 12, padding: 14 }, noticeTitle: { color: colors.greenDark, fontSize: 14, fontWeight: "900" }, noticeBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  section: { color: colors.ink, fontSize: 19, fontWeight: "900", marginTop: 24 }, field: { flex: 1 }, label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 12 }, input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 14, minHeight: 50, paddingHorizontal: 13 }, multiline: { minHeight: 110, paddingTop: 13, textAlignVertical: "top" }, helper: { color: colors.muted, fontSize: 10, marginTop: 4 }, double: { flexDirection: "row", gap: 10 }, half: { flex: 1 },
  switchRow: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: "row", marginTop: 20, padding: 14 }, switchCopy: { flex: 1, paddingRight: 12 }, switchTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" }, switchBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, justifyContent: "center", marginTop: 22, minHeight: 54 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.6 },
  modeRow: { flexDirection: "row", gap: 9, marginTop: 12 }, mode: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, minHeight: 104, padding: 13 }, modeActive: { backgroundColor: colors.green, borderColor: colors.green }, modeTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" }, modeTitleActive: { color: "#FFFFFF" }, modeBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }, modeBodyActive: { color: "#D9E9E2" }, delivery: { backgroundColor: colors.greenSoft, borderRadius: 14, marginTop: 12, padding: 13 }, deliveryTitle: { color: colors.greenDark, fontSize: 13, fontWeight: "900" }, deliveryBody: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
});
