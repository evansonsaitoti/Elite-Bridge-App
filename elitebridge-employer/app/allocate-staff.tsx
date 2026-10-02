import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { assignCaregiverToShift, getEmployerShifts, getEmployerTeam, getStoredEmployer, Shift, TeamMember } from "../lib/api";
import { colors } from "../lib/theme";

export default function AllocateStaffScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ shiftId?: string }>();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(params.shiftId ? Number(params.shiftId) : null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) return router.replace("/sign-in");
      const [shiftRows, teamRows] = await Promise.all([getEmployerShifts(), getEmployerTeam()]);
      const openShifts = shiftRows.filter((shift) => ["open", "assigned", "in_progress"].includes(shift.status) && shift.remainingPositions > 0);
      setShifts(openShifts);
      setTeam(teamRows);
      if (!selectedShiftId && openShifts[0]) setSelectedShiftId(openShifts[0].id);
    } catch (error) {
      Alert.alert("Unable to load allocation options", error instanceof Error ? error.message : "Please try again.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [router, selectedShiftId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const selectedShift = useMemo(() => shifts.find((shift) => shift.id === selectedShiftId), [selectedShiftId, shifts]);

  const assign = async (member: TeamMember) => {
    if (!selectedShift) return Alert.alert("Choose a shift", "Select an open shift first.");
    Alert.alert("Assign caregiver?", `Assign ${member.first_name} ${member.last_name} to ${selectedShift.careRecipientName || selectedShift.serviceType}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Assign", onPress: async () => {
        setBusyId(member.caregiver_id);
        try {
          await assignCaregiverToShift(selectedShift.id, member.caregiver_id);
          Alert.alert("Staff assigned", `${member.first_name} was assigned and will be notified.`, [{ text: "OK", onPress: () => void load(true) }]);
        } catch (error) {
          Alert.alert("Could not assign staff", error instanceof Error ? error.message : "Please try again.");
        } finally { setBusyId(null); }
      } },
    ]);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
        <View style={styles.notice}><Ionicons color="#FFFFFF" name="people" size={24} /><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Assign existing staff</Text><Text style={styles.noticeBody}>Use this when you already know who should cover the visit. Review-first and instant-claim options still remain available.</Text></View></View>
        {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}

        <Text style={styles.section}>Choose shift</Text>
        {!loading && shifts.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No open shifts to allocate</Text><Text style={styles.emptyBody}>Post Barry’s schedule first, or reopen the shifts page to check coverage.</Text><TouchableOpacity onPress={() => router.push("/client-schedule")} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Post Barry schedule</Text></TouchableOpacity></View> : null}
        {shifts.map((shift) => {
          const active = selectedShiftId === shift.id;
          return <TouchableOpacity key={shift.id} onPress={() => setSelectedShiftId(shift.id)} style={[styles.shiftCard, active && styles.shiftActive]}>
            <Text style={[styles.shiftTitle, active && styles.activeText]}>{shift.careRecipientName || shift.serviceType}</Text>
            <Text style={[styles.shiftMeta, active && styles.activeSubtext]}>{new Date(shift.startTime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
            <Text style={[styles.shiftMeta, active && styles.activeSubtext]}>{shift.remainingPositions} open position{shift.remainingPositions === 1 ? "" : "s"} · ${Number(shift.hourlyRate).toFixed(2)}/hr</Text>
          </TouchableOpacity>;
        })}

        <Text style={styles.section}>Available staff</Text>
        {!loading && team.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No connected staff yet</Text><Text style={styles.emptyBody}>Approve an application or invite caregivers first. Then they will appear here for direct allocation.</Text></View> : null}
        {team.map((member) => {
          const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`.toUpperCase();
          return <View key={member.caregiver_id} style={styles.memberCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials || "CG"}</Text></View>
            <View style={styles.memberCopy}><Text style={styles.memberName}>{member.first_name} {member.last_name}</Text><Text style={styles.memberMeta}>{member.upcoming_shifts || 0} upcoming · {Number(member.total_hours || 0).toFixed(1)} recorded hrs</Text></View>
            <TouchableOpacity disabled={!selectedShift || busyId === member.caregiver_id} onPress={() => void assign(member)} style={[styles.assignButton, (!selectedShift || busyId === member.caregiver_id) && styles.disabled]}>{busyId === member.caregiver_id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.assignText}>Assign</Text>}</TouchableOpacity>
          </View>;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { padding: 20, paddingBottom: 44 }, loader: { marginTop: 40 },
  notice: { alignItems: "center", backgroundColor: colors.greenDark, borderRadius: 18, flexDirection: "row", padding: 16 }, noticeCopy: { flex: 1, marginLeft: 12 }, noticeTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" }, noticeBody: { color: "#CEE2D8", fontSize: 11, lineHeight: 17, marginTop: 4 },
  section: { color: colors.ink, fontSize: 19, fontWeight: "900", marginTop: 24 }, shiftCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 10, padding: 14 }, shiftActive: { backgroundColor: colors.green, borderColor: colors.green }, shiftTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" }, shiftMeta: { color: colors.muted, fontSize: 12, marginTop: 5 }, activeText: { color: "#FFFFFF" }, activeSubtext: { color: "#E3EFEA" },
  memberCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", marginTop: 10, padding: 12 }, avatar: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 22, height: 44, justifyContent: "center", marginRight: 11, width: 44 }, avatarText: { color: colors.green, fontWeight: "900" }, memberCopy: { flex: 1 }, memberName: { color: colors.ink, fontSize: 14, fontWeight: "900" }, memberMeta: { color: colors.muted, fontSize: 11, marginTop: 4 }, assignButton: { alignItems: "center", backgroundColor: colors.green, borderRadius: 11, minWidth: 78, paddingHorizontal: 14, paddingVertical: 10 }, assignText: { color: "#FFFFFF", fontWeight: "900" }, disabled: { opacity: 0.55 },
  empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 10, padding: 22 }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" }, emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: "center" }, emptyButton: { borderColor: colors.green, borderRadius: 11, borderWidth: 1, marginTop: 14, paddingHorizontal: 16, paddingVertical: 10 }, emptyButtonText: { color: colors.green, fontWeight: "900" },
});
