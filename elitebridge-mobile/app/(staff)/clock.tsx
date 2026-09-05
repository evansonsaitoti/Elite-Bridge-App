import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  type CaregiverApplication,
  type CaregiverTimesheet,
  type ClockLocationPayload,
  clockInToShift,
  clockOutOfShift,
  endShiftBreak,
  fetchCaregiverTimesheets,
  fetchMyApplications,
  resubmitCaregiverTimesheet,
  startShiftBreak,
} from "@/lib/shared-api";

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

function formatHours(value: number) {
  return `${value.toFixed(2)} hrs`;
}

function statusLabel(status: CaregiverTimesheet["status"]) {
  if (status === "in_progress") return "Clocked in";
  if (status === "submitted") return "Pending approval";
  if (status === "approved") return "Approved";
  return "Correction requested";
}

export default function StaffClock() {
  const colors = useColors();
  const [assignments, setAssignments] = useState<CaregiverApplication[]>([]);
  const [timesheets, setTimesheets] = useState<CaregiverTimesheet[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [applications, records] = await Promise.all([fetchMyApplications(), fetchCaregiverTimesheets()]);
      const approved = applications.filter((item) => item.status === "approved" && !["cancelled", "completed", "closed"].includes(item.shift.status));
      setAssignments(approved);
      setTimesheets(records);
      const active = records.find((item) => item.status === "in_progress");
      setSelectedShiftId((current) => active?.shiftId ?? current ?? approved[0]?.shift.id ?? null);
    } catch (error) {
      Alert.alert("Unable to load time records", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeTimesheet = timesheets.find((item) => item.status === "in_progress") ?? null;
  const selectedAssignment = assignments.find((item) => item.shift.id === selectedShiftId) ?? assignments[0] ?? null;
  const activeBreak = Boolean(activeTimesheet?.breaks.some((item) => !item.endedAt));
  const completed = useMemo(() => timesheets.filter((item) => item.status !== "in_progress"), [timesheets]);

  const captureLocation = async (): Promise<ClockLocationPayload | null> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: current.coords.latitude, longitude: current.coords.longitude, accuracy: current.coords.accuracy, capturedAt: new Date(current.timestamp).toISOString() };
  };

  const handleClockIn = async () => {
    if (!selectedAssignment || busy) return;
    setBusy(true);
    try {
      await clockInToShift(selectedAssignment.shift.id, await captureLocation());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load(true);
      Alert.alert("Clocked in", "Your employer can now see this attendance event.");
    } catch (error) {
      Alert.alert("Unable to clock in", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  };

  const completeClockOut = async () => {
    if (!activeTimesheet || busy) return;
    setBusy(true);
    try {
      await clockOutOfShift(activeTimesheet.shiftId, notes, await captureLocation());
      setNotes("");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load(true);
      Alert.alert("Timesheet submitted", "Your recorded hours were sent to the employer for review.");
    } catch (error) {
      Alert.alert("Unable to clock out", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  };

  const handleBreak = async () => {
    if (!activeTimesheet || busy) return;
    setBusy(true);
    try {
      if (activeBreak) await endShiftBreak(activeTimesheet.shiftId);
      else await startShiftBreak(activeTimesheet.shiftId);
      await load(true);
    } catch (error) {
      Alert.alert("Unable to update break", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  };

  const handleResubmit = async (timesheet: CaregiverTimesheet) => {
    const response = correctionNotes[timesheet.id]?.trim();
    if (!response) return Alert.alert("Response required", "Add your correction details before resubmitting.");
    setBusy(true);
    try {
      await resubmitCaregiverTimesheet(timesheet.id, response);
      setCorrectionNotes((current) => ({ ...current, [timesheet.id]: "" }));
      await load(true);
      Alert.alert("Timesheet resubmitted", "The employer has been notified.");
    } catch (error) {
      Alert.alert("Unable to resubmit", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  };

  return <ScreenContainer><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    <View style={styles.header}>
      <View><Text style={[styles.eyebrow, { color: colors.primary }]}>TIME & ATTENDANCE</Text><Text style={[styles.title, { color: colors.foreground }]}>My timesheets</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Clock real assigned shifts and send verified hours to your employer.</Text></View>
      <View style={styles.headerIcon}><IconSymbol name="clock.fill" size={27} color="#FFFFFF" /></View>
    </View>

    {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} /> : null}

    {!loading && activeTimesheet ? <View style={[styles.activeCard, { backgroundColor: colors.primary }]}>
      <Text style={styles.activeLabel}>{activeBreak ? "BREAK IN PROGRESS" : "CURRENTLY CLOCKED IN"}</Text>
      <Text style={styles.activeTitle}>{activeTimesheet.shiftTitle}</Text>
      <Text style={styles.activeMeta}>Started {formatDateTime(activeTimesheet.clockInAt)} · {formatHours(activeTimesheet.workedHours)}</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="Visit notes or completed tasks" placeholderTextColor="#BFD7CC" multiline style={styles.notes} />
      <View style={styles.actionRow}>
        <TouchableOpacity disabled={busy} onPress={() => void handleBreak()} style={[styles.secondaryButton, activeBreak && { backgroundColor: "#D7A94B" }]}><Text style={[styles.secondaryText, activeBreak && { color: "#FFFFFF" }]}>{activeBreak ? "End break" : "Start break"}</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={() => Alert.alert("Clock out and submit?", "Your recorded time and notes will be sent to the employer.", [{ text: "Cancel", style: "cancel" }, { text: "Submit", onPress: () => void completeClockOut() }])} style={styles.submitButton}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Clock out</Text>}</TouchableOpacity>
      </View>
    </View> : null}

    {!loading && !activeTimesheet ? <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Confirmed assignments</Text>
      <Text style={[styles.sectionBody, { color: colors.muted }]}>Only shifts accepted through Elite Bridge can be clocked.</Text>
      {assignments.map((item) => {
        const selected = selectedAssignment?.shift.id === item.shift.id;
        return <TouchableOpacity key={item.id} onPress={() => setSelectedShiftId(item.shift.id)} style={[styles.shiftRow, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? "#EAF4EF" : colors.surface }]}>
          <View style={{ flex: 1 }}><Text style={[styles.shiftTitle, { color: colors.foreground }]}>{item.shift.serviceType}{item.shift.careRecipientName ? ` · ${item.shift.careRecipientName}` : ""}</Text><Text style={[styles.shiftMeta, { color: colors.muted }]}>{item.shift.employerName || "Elite Bridge Employer"} · {item.shift.location.city}, {item.shift.location.state}</Text><Text style={[styles.shiftMeta, { color: colors.muted }]}>{formatDateTime(item.shift.startTime)} – {formatDateTime(item.shift.endTime)}</Text></View>
          <View style={[styles.radio, { borderColor: colors.primary }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
        </TouchableOpacity>;
      })}
      {assignments.length === 0 ? <View style={styles.empty}><IconSymbol name="calendar" size={30} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No confirmed shift to clock</Text><Text style={[styles.emptyBody, { color: colors.muted }]}>Claim or receive approval for a shift in Work. It will then appear here automatically.</Text></View> : <TouchableOpacity disabled={!selectedAssignment || busy} onPress={() => void handleClockIn()} style={[styles.primaryButton, { backgroundColor: colors.primary }, busy && { opacity: 0.55 }]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Clock in to selected shift</Text>}</TouchableOpacity>}
    </View> : null}

    {!loading ? <View style={{ marginTop: 24 }}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Timesheet history</Text><Text style={[styles.sectionBody, { color: colors.muted }]}>Submitted records stay synchronized with the employer app.</Text>
      {completed.map((item) => <View key={item.id} style={[styles.record, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.recordTop}><View style={{ flex: 1 }}><Text style={[styles.shiftTitle, { color: colors.foreground }]}>{item.shiftTitle}</Text><Text style={[styles.shiftMeta, { color: colors.muted }]}>{formatDateTime(item.clockInAt)} – {formatDateTime(item.clockOutAt || undefined)}</Text></View><View style={[styles.badge, item.status === "approved" ? styles.approved : item.status === "correction_requested" ? styles.correction : styles.pending]}><Text style={styles.badgeText}>{statusLabel(item.status)}</Text></View></View>
        <View style={styles.totals}><Text style={[styles.totalText, { color: colors.foreground }]}>{formatHours(item.workedHours)}</Text><Text style={[styles.totalText, { color: colors.foreground }]}>${item.grossAmount.toFixed(2)}</Text></View>
        {item.employerNote ? <View style={styles.noteBox}><Text style={styles.noteLabel}>EMPLOYER NOTE</Text><Text style={styles.noteText}>{item.employerNote}</Text></View> : null}
        {item.status === "correction_requested" ? <><TextInput value={correctionNotes[item.id] || ""} onChangeText={(value) => setCorrectionNotes((current) => ({ ...current, [item.id]: value }))} placeholder="Explain the correction" multiline style={[styles.correctionInput, { color: colors.foreground, borderColor: colors.border }]} /><TouchableOpacity disabled={busy} onPress={() => void handleResubmit(item)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Resubmit timesheet</Text></TouchableOpacity></> : null}
      </View>)}
      {completed.length === 0 ? <Text style={[styles.emptyBody, { color: colors.muted, textAlign: "center", marginTop: 18 }]}>Completed shifts will appear here after clock-out.</Text> : null}
    </View> : null}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 42 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, title: { fontSize: 29, fontWeight: "900", marginTop: 4 }, subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 290 }, headerIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#0A4A35" }, card: { borderRadius: 20, borderWidth: 1, padding: 17 }, activeCard: { borderRadius: 22, padding: 19 }, activeLabel: { color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, activeTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900", marginTop: 7 }, activeMeta: { color: "#D9E9E2", fontSize: 12, marginTop: 6 }, notes: { minHeight: 86, borderRadius: 13, padding: 12, marginTop: 16, backgroundColor: "rgba(255,255,255,0.12)", color: "#FFFFFF", textAlignVertical: "top" }, actionRow: { flexDirection: "row", gap: 9, marginTop: 11 }, secondaryButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }, secondaryText: { color: "#0A4A35", fontWeight: "900" }, submitButton: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#B42318" }, submitText: { color: "#FFFFFF", fontWeight: "900" }, sectionTitle: { fontSize: 19, fontWeight: "900" }, sectionBody: { fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 13 }, shiftRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 9, gap: 10 }, shiftTitle: { fontSize: 14, fontWeight: "900" }, shiftMeta: { fontSize: 11, lineHeight: 17, marginTop: 3 }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" }, radioDot: { width: 10, height: 10, borderRadius: 5 }, primaryButton: { minHeight: 50, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 9 }, primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" }, empty: { alignItems: "center", paddingVertical: 24 }, emptyTitle: { fontSize: 16, fontWeight: "900", marginTop: 9 }, emptyBody: { fontSize: 12, lineHeight: 18, marginTop: 5 }, record: { borderRadius: 17, borderWidth: 1, padding: 14, marginTop: 10 }, recordTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, approved: { backgroundColor: "#DFF4E8" }, pending: { backgroundColor: "#FFF1D6" }, correction: { backgroundColor: "#FEE4E2" }, badgeText: { color: "#344054", fontSize: 9, fontWeight: "900" }, totals: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D0D5DD", marginTop: 12, paddingTop: 11 }, totalText: { fontSize: 15, fontWeight: "900" }, noteBox: { backgroundColor: "#FFF5F4", borderRadius: 10, padding: 10, marginTop: 10 }, noteLabel: { color: "#B42318", fontSize: 9, fontWeight: "900" }, noteText: { color: "#7A271A", fontSize: 12, lineHeight: 18, marginTop: 4 }, correctionInput: { minHeight: 72, borderWidth: 1, borderRadius: 11, padding: 11, marginTop: 10, textAlignVertical: "top" },
});
