import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { createEmployerShift, ShiftInput } from "../lib/api";
import { colors } from "../lib/theme";

const client = {
  name: "Barry Schwartz",
  address: "27 Pleasant Street",
  city: "Manchester",
  state: "MA",
  zipCode: "01944",
  phone: "(914) 450-6397",
};

const visits = [
  { day: "Thursday", startTime: "10:00", endTime: "13:00" },
  { day: "Thursday", startTime: "16:00", endTime: "21:00" },
  { day: "Friday", startTime: "10:00", endTime: "13:00" },
  { day: "Friday", startTime: "16:00", endTime: "21:00" },
  { day: "Saturday", startTime: "10:00", endTime: "13:00" },
  { day: "Saturday", startTime: "16:00", endTime: "21:00" },
  { day: "Sunday", startTime: "10:00", endTime: "13:00" },
  { day: "Sunday", startTime: "16:00", endTime: "21:00" },
];

const dayOffsets: Record<string, number> = { Thursday: 0, Friday: 1, Saturday: 2, Sunday: 3 };

function addDays(date: string, days: number) {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export default function ClientScheduleScreen() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [rate, setRate] = useState("40");
  const [serviceType, setServiceType] = useState("Personal care");
  const [caregiverType, setCaregiverType] = useState("Caregiver");
  const [responsibilities, setResponsibilities] = useState("Personal care, companionship, meal support, light housekeeping, and safety monitoring.");
  const [assignmentMode, setAssignmentMode] = useState<"instant" | "review">("review");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => visits.map((visit) => ({ ...visit, date: startDate ? addDays(startDate, dayOffsets[visit.day]) : "Select start date" })), [startDate]);

  const postSchedule = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return Alert.alert("Add start date", "Enter the Thursday date in YYYY-MM-DD format.");
    const hourlyRate = Number(rate);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return Alert.alert("Check rate", "Enter a valid hourly rate.");
    setBusy(true);
    try {
      const posted = [];
      for (const visit of preview) {
        const input: ShiftInput = {
          careRecipientName: client.name,
          serviceType,
          caregiverType,
          startDate: visit.date,
          timeZone: "America/New_York",
          numberOfCaregivers: 1,
          startTime: visit.startTime,
          endTime: visit.endTime,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode,
          hourlyRate,
          responsibilities,
          contactName: client.name,
          contactPhone: client.phone,
          urgency: "standard",
          assignmentMode,
        };
        const result = await createEmployerShift(input);
        posted.push(result.shift.id);
      }
      Alert.alert(
        "Client schedule posted",
        `Created ${posted.length} shifts for ${client.name}. Next you can allocate staff from the shifts page.`,
        [{ text: "Allocate staff", onPress: () => router.replace("/shifts") }]
      );
    } catch (error) {
      Alert.alert("Schedule not posted", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.clientCard}>
            <Text style={styles.kicker}>New client</Text>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientMeta}>{client.address}, {client.city}, {client.state} {client.zipCode}</Text>
            <Text style={styles.clientMeta}>{client.phone}</Text>
          </View>

          <Text style={styles.section}>Schedule</Text>
          <Field label="Thursday start date" helper="YYYY-MM-DD. The app creates Thu-Sun automatically." placeholder="2026-10-08" value={startDate} onChangeText={setStartDate} keyboardType="numbers-and-punctuation" />
          <View style={styles.scheduleCard}>
            {preview.map((visit, index) => <View key={`${visit.day}-${visit.startTime}`} style={[styles.visitRow, index === preview.length - 1 && styles.lastRow]}><Text style={styles.visitDay}>{visit.day}</Text><Text style={styles.visitTime}>{visit.date} · {visit.startTime} - {visit.endTime}</Text></View>)}
          </View>

          <Text style={styles.section}>Care and pay</Text>
          <Field label="Service" value={serviceType} onChangeText={setServiceType} />
          <Field label="Caregiver type" value={caregiverType} onChangeText={setCaregiverType} />
          <Field label="Client bill rate" helper="Private agency rate. Caregiver pay is set later when allocating staff." value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
          <Field label="Responsibilities" value={responsibilities} onChangeText={setResponsibilities} multiline numberOfLines={4} style={styles.multiline} />

          <Text style={styles.section}>Staff allocation option</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity onPress={() => setAssignmentMode("review")} style={[styles.mode, assignmentMode === "review" && styles.modeActive]}>
              <Text style={[styles.modeTitle, assignmentMode === "review" && styles.modeTitleActive]}>Review first</Text>
              <Text style={[styles.modeBody, assignmentMode === "review" && styles.modeBodyActive]}>Staff apply, then you approve the caregiver you want.</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAssignmentMode("instant")} style={[styles.mode, assignmentMode === "instant" && styles.modeActive]}>
              <Text style={[styles.modeTitle, assignmentMode === "instant" && styles.modeTitleActive]}>Instant claim</Text>
              <Text style={[styles.modeBody, assignmentMode === "instant" && styles.modeBodyActive]}>Available matched staff can claim open visits immediately.</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>After posting, open any shift and tap Allocate staff to assign Gladis, Catherine, Lucy, or another connected caregiver directly.</Text>

          <TouchableOpacity disabled={busy} onPress={() => void postSchedule()} style={[styles.primary, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Post 8 visits for Barry</Text>}</TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, helper, style, ...props }: { label: string; helper?: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} autoCorrect={false} placeholderTextColor="#8A9790" style={[styles.input, style]} />{helper ? <Text style={styles.helper}>{helper}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, fill: { flex: 1 }, content: { padding: 20, paddingBottom: 44 },
  clientCard: { backgroundColor: colors.greenDark, borderRadius: 20, padding: 18 }, kicker: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" }, clientName: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", marginTop: 8 }, clientMeta: { color: "#D7E8DF", fontSize: 13, lineHeight: 19, marginTop: 3 },
  section: { color: colors.ink, fontSize: 19, fontWeight: "900", marginTop: 24 }, field: { marginTop: 12 }, label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 7 }, input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 14, minHeight: 50, paddingHorizontal: 13 }, helper: { color: colors.muted, fontSize: 10, marginTop: 4 }, multiline: { minHeight: 108, paddingTop: 13, textAlignVertical: "top" },
  scheduleCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 12, paddingHorizontal: 14 }, visitRow: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 12 }, lastRow: { borderBottomWidth: 0 }, visitDay: { color: colors.ink, fontSize: 13, fontWeight: "900" }, visitTime: { color: colors.muted, fontSize: 12, marginTop: 3 },
  modeRow: { flexDirection: "row", gap: 10, marginTop: 12 }, mode: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, minHeight: 118, padding: 13 }, modeActive: { backgroundColor: colors.green, borderColor: colors.green }, modeTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" }, modeTitleActive: { color: "#FFFFFF" }, modeBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 6 }, modeBodyActive: { color: "#D9E9E2" }, note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, justifyContent: "center", marginTop: 22, minHeight: 54 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.6 },
});
