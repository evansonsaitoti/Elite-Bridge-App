import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getEmployerAttendance, getEmployerTimesheets, getStoredEmployer, reviewTimesheet, EmployerTimesheet, ShiftActivity } from "../lib/api";
import { colors } from "../lib/theme";
import { EmployerTabBar } from "../components/employer-tab-bar";

export default function TimeScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<ShiftActivity[]>([]);
  const [timesheets, setTimesheets] = useState<EmployerTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockedIn, setClockedIn] = useState(0);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) return router.replace("/sign-in");
      const [activityResult, timesheetResult] = await Promise.all([
        getEmployerAttendance(),
        getEmployerTimesheets(),
      ]);
      setActivities(activityResult.activities);
      setClockedIn(activityResult.activeCount);
      setTimesheets(timesheetResult);
    } catch (error) { Alert.alert("Unable to load attendance", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const decide = async (id: number, status: "approved" | "correction_requested") => {
    if (saving) return;
    setSaving(true);
    try {
      await reviewTimesheet(id, status, reviewNote);
      setReviewing(null); setReviewNote(""); await load(true);
    } catch (e) { Alert.alert("Review not saved", e instanceof Error ? e.message : "Try again"); }
    finally { setSaving(false); }
  };
  const pendingTimesheets = timesheets.filter((item) => item.status === "pending_approval").length;
  const payrollTotal = timesheets.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

  return <SafeAreaView edges={["bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
    <View style={styles.summary}><View><Text style={styles.summaryLabel}>CURRENT ATTENDANCE</Text><Text style={styles.summaryValue}>{clockedIn} clocked in</Text><Text style={styles.summaryBody}>Live activity from caregivers assigned through Elite Bridge shifts.</Text></View><View style={styles.clockIcon}><Ionicons color="#FFFFFF" name="time" size={27} /></View></View>
    <View style={styles.timesheetSummary}>
      <View style={styles.timesheetMetric}><Text style={styles.timesheetValue}>{pendingTimesheets}</Text><Text style={styles.timesheetLabel}>Pending timesheets</Text></View>
      <View style={styles.timesheetMetric}><Text style={styles.timesheetValue}>{timesheets.length}</Text><Text style={styles.timesheetLabel}>Completed visits</Text></View>
      <View style={styles.timesheetMetric}><Text style={styles.timesheetValue}>${payrollTotal.toFixed(0)}</Text><Text style={styles.timesheetLabel}>Payroll total</Text></View>
    </View>
    <View style={styles.headingRow}><Text style={styles.heading}>Timesheets</Text><Text style={styles.headingMeta}>Generated after clock-out</Text></View>
    {!loading && timesheets.length === 0 ? <View style={styles.emptyCompact}><Ionicons color={colors.green} name="document-text-outline" size={30} /><Text style={styles.emptyTitle}>No timesheets yet</Text><Text style={styles.emptyBody}>When a caregiver clocks out, Elite Bridge creates a timesheet here for your review.</Text></View> : null}
    {timesheets.map((sheet) => (
      <View key={sheet.id} style={styles.timesheetCard}>
        <View style={styles.timesheetTop}><View style={styles.documentIcon}><Ionicons color={colors.green} name="document-text" size={20} /></View><View style={styles.activityCopy}><Text style={styles.name}>{sheet.first_name} {sheet.last_name}</Text><Text style={styles.shift}>{sheet.shift_title}</Text><Text style={styles.time}>{new Date(sheet.clock_in_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - {new Date(sheet.clock_out_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {Number(sheet.worked_hours).toFixed(2)} hrs</Text></View><Text style={styles.total}>${Number(sheet.total_amount).toFixed(2)}</Text></View>
        {sheet.notes ? <Text style={styles.shift}>Caregiver notes: {sheet.notes}</Text> : null}
        {sheet.agency_note ? <Text style={styles.shift}>Review note: {sheet.agency_note}</Text> : null}
        <Text style={styles.statusPill}>{sheet.status.replaceAll("_", " ").toUpperCase()}</Text>
        {sheet.status === "pending_approval" ? <View>
          <TouchableOpacity disabled={saving} onPress={() => { setReviewing(reviewing === sheet.id ? null : sheet.id); setReviewNote(""); }} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Review timesheet</Text></TouchableOpacity>
          {reviewing === sheet.id ? <View>
            <Text style={styles.emptyBody}>Confirm recorded hours before approval. Approval does not send payment.</Text>
            <TextInput accessibilityLabel="Timesheet review note" placeholder="Note (required for clarification)" multiline value={reviewNote} onChangeText={setReviewNote} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 10, color: colors.ink }} />
            <TouchableOpacity disabled={saving} onPress={() => void decide(sheet.id, "approved")} style={styles.emptyButton}><Text style={styles.emptyButtonText}>{saving ? "Saving…" : "Approve recorded hours"}</Text></TouchableOpacity>
            <TouchableOpacity disabled={saving || !reviewNote.trim()} onPress={() => void decide(sheet.id, "correction_requested")} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Request clarification</Text></TouchableOpacity>
          </View> : null}
        </View> : null}
      </View>
    ))}
    <View style={styles.headingRow}><Text style={styles.heading}>Recent activity</Text><TouchableOpacity onPress={() => void load(true)}><Ionicons color={colors.green} name="refresh" size={21} /></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}
    {!loading && activities.length === 0 ? <View style={styles.empty}><Ionicons color={colors.green} name="time-outline" size={36} /><Text style={styles.emptyTitle}>No time activity yet</Text><Text style={styles.emptyBody}>Clock-ins and clock-outs from assigned caregiver visits will appear here automatically.</Text><TouchableOpacity onPress={() => router.push("/shifts")} style={styles.emptyButton}><Text style={styles.emptyButtonText}>View schedule</Text></TouchableOpacity></View> : null}
    {activities.map((activity) => {
      const isIn = activity.type === "clock_in";
      return <View key={activity.id} style={styles.card}><View style={[styles.activityIcon, isIn ? styles.inIcon : styles.outIcon]}><Ionicons color={isIn ? colors.green : colors.gold} name={isIn ? "log-in-outline" : "log-out-outline"} size={21} /></View><View style={styles.activityCopy}><Text style={styles.name}>{activity.first_name} {activity.last_name}</Text><Text style={styles.action}>{isIn ? "Clocked in" : activity.type === "clock_out" ? "Clocked out" : activity.type.replaceAll("_", " ")}</Text><Text style={styles.shift}>{activity.shift_title}</Text><Text style={styles.time}>{new Date(activity.timestamp).toLocaleString()}</Text>{activity.type === "clock_in" || activity.type === "clock_out" ? <Text style={styles.time}>{activity.location ? "GPS captured · location review required" : "No GPS evidence"}</Text> : null}</View></View>;
    })}
  </ScrollView><EmployerTabBar /></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { padding: 20, paddingBottom: 42 }, summary: { alignItems: "center", backgroundColor: colors.greenDark, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", padding: 17 }, summaryLabel: { color: "#D7A94B", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, summaryValue: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginTop: 5 }, summaryBody: { color: "#CEE2D8", fontSize: 11, lineHeight: 17, marginTop: 4, maxWidth: 260 }, clockIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 25, height: 50, justifyContent: "center", width: 50 }, timesheetSummary: { flexDirection: "row", gap: 8, marginTop: 12 }, timesheetMetric: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, padding: 12 }, timesheetValue: { color: colors.green, fontSize: 18, fontWeight: "900" }, timesheetLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", marginTop: 3 }, headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 24 }, heading: { color: colors.ink, fontSize: 19, fontWeight: "900" }, headingMeta: { color: colors.muted, fontSize: 11, fontWeight: "700" }, loader: { marginTop: 45 }, empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 28 }, emptyCompact: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 12, padding: 20 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 10 }, emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: "center" }, emptyButton: { borderColor: colors.green, borderRadius: 11, borderWidth: 1, marginTop: 16, paddingHorizontal: 18, paddingVertical: 11 }, emptyButtonText: { color: colors.green, fontWeight: "900" }, card: { alignItems: "flex-start", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", marginBottom: 9, padding: 14 }, timesheetCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 9, padding: 14 }, timesheetTop: { alignItems: "flex-start", flexDirection: "row" }, documentIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 12, height: 42, justifyContent: "center", marginRight: 12, width: 42 }, total: { color: colors.ink, fontSize: 14, fontWeight: "900" }, statusPill: { alignSelf: "flex-start", backgroundColor: colors.greenSoft, borderRadius: 999, color: colors.green, fontSize: 9, fontWeight: "900", marginTop: 11, paddingHorizontal: 9, paddingVertical: 5 }, activityIcon: { alignItems: "center", borderRadius: 12, height: 42, justifyContent: "center", marginRight: 12, width: 42 }, inIcon: { backgroundColor: colors.greenSoft }, outIcon: { backgroundColor: colors.warningSoft }, activityCopy: { flex: 1 }, name: { color: colors.ink, fontSize: 14, fontWeight: "900" }, action: { color: colors.green, fontSize: 12, fontWeight: "800", marginTop: 3, textTransform: "capitalize" }, shift: { color: colors.muted, fontSize: 11, marginTop: 5 }, time: { color: colors.muted, fontSize: 10, marginTop: 4 },
});
