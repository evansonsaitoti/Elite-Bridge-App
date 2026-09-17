import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { cancelEmployerShift, getEmployerShifts, getStoredEmployer, Shift } from "../lib/api";
import { colors } from "../lib/theme";
import { EmployerTabBar } from "../components/employer-tab-bar";

export default function ShiftsScreen() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) return router.replace("/sign-in");
      setShifts(await getEmployerShifts());
    } catch (error) {
      Alert.alert("Unable to load shifts", error instanceof Error ? error.message : "Please try again.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
        <TouchableOpacity onPress={() => router.push("/post-shift")} style={styles.primary}><Text style={styles.primaryText}>＋ Post a new shift</Text></TouchableOpacity>
        {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}
        {!loading && shifts.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No shifts posted yet</Text><Text style={styles.emptyBody}>Create your first opportunity. It will be shared with eligible users of Elite Bridge Caregiver.</Text></View> : null}
        {shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} onChanged={() => void load(true)} />)}
      </ScrollView><EmployerTabBar />
    </SafeAreaView>
  );
}

function ShiftCard({ shift, onChanged }: { shift: Shift; onChanged: () => void }) {
  const start = new Date(shift.startTime);
  const statusColor = shift.status === "assigned" ? colors.green : shift.urgency === "urgent" ? colors.danger : colors.warning;
  const cancel = () => Alert.alert("Cancel this shift?", "Caregivers assigned to this shift will be notified immediately.", [{ text: "Keep shift", style: "cancel" }, { text: "Cancel shift", style: "destructive", onPress: async () => { try { await cancelEmployerShift(shift.id); onChanged(); } catch (error) { Alert.alert("Shift not cancelled", error instanceof Error ? error.message : "Please try again."); } } }]);
  return <View style={styles.card}><View style={styles.row}><Text style={[styles.status, { color: statusColor }]}>{shift.status.toUpperCase()}</Text><Text style={styles.rate}>${Number(shift.hourlyRate).toFixed(2)}/hr</Text></View><Text style={styles.cardTitle}>{shift.serviceType}</Text>{shift.careRecipientName ? <Text style={styles.recipient}>{shift.careRecipientName}</Text> : null}<Text style={styles.meta}>{start.toLocaleDateString()} at {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text><Text style={styles.meta}>{shift.location.city}, {shift.location.state}</Text><Text style={styles.mode}>{shift.assignmentMode === "instant" ? "Qualified caregivers can claim instantly" : "Employer approval required"}</Text><Text style={styles.description}>{shift.responsibilities}</Text>{shift.status === "open" || shift.status === "assigned" ? <TouchableOpacity onPress={cancel} style={styles.cancel}><Text style={styles.cancelText}>Cancel shift</Text></TouchableOpacity> : null}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 42 }, primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, justifyContent: "center", marginBottom: 16, minHeight: 52 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, loader: { marginTop: 50 },
  empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 26 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" }, emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: "center" },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 11, padding: 16 }, row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, status: { fontSize: 10, fontWeight: "900", letterSpacing: 1 }, rate: { color: colors.ink, fontSize: 13, fontWeight: "900" }, cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 9 }, recipient: { color: colors.green, fontSize: 13, fontWeight: "800", marginTop: 3 }, meta: { color: colors.muted, fontSize: 12, marginTop: 5 }, description: { borderTopColor: colors.border, borderTopWidth: 1, color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12, paddingTop: 11 },
  mode: { color: colors.green, fontSize: 11, fontWeight: "800", marginTop: 8 }, cancel: { alignItems: "center", borderColor: colors.danger, borderRadius: 10, borderWidth: 1, marginTop: 13, padding: 10 }, cancelText: { color: colors.danger, fontSize: 12, fontWeight: "900" },
});
