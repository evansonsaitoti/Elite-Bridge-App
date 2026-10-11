import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { cancelEmployerShift, getEmployerShifts, getStoredEmployer, openEmployerShiftForPickup, Shift } from "../lib/api";
import { cardShadow, colors } from "../lib/theme";
import { EmployerTabBar } from "../components/employer-tab-bar";

const statuses = ["All", "Open", "Assigned", "Cancelled"] as const;
const locations = ["All", "Gloucester", "Manchester"] as const;

function shiftDate(shift: Shift) {
  const start = new Date(shift.startTime);
  if (Number.isNaN(start.getTime())) return "Date pending";
  return start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function shiftTime(shift: Shift) {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Time pending";
  return `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function statusLabel(status: string) {
  if (status === "in_progress") return "In progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ShiftsScreen() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<typeof statuses[number]>("All");
  const [locationFilter, setLocationFilter] = useState<typeof locations[number]>("All");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) return router.replace("/sign-in");
      setShifts(await getEmployerShifts());
    } catch (error) {
      Alert.alert("Unable to load shifts", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleShifts = useMemo(() => shifts.filter((shift) => {
    const normalizedStatus = shift.status.toLowerCase();
    const statusMatch = statusFilter === "All"
      || (statusFilter === "Assigned" && ["assigned", "in_progress"].includes(normalizedStatus))
      || normalizedStatus === statusFilter.toLowerCase();
    const locationMatch = locationFilter === "All" || shift.location.city.toLowerCase().includes(locationFilter.toLowerCase());
    return statusMatch && locationMatch;
  }), [locationFilter, shifts, statusFilter]);

  const openCount = shifts.filter((shift) => shift.status === "open").length;
  const assignedCount = shifts.filter((shift) => shift.status === "assigned" || shift.status === "in_progress").length;
  const urgentCount = shifts.filter((shift) => shift.urgency === "urgent" && shift.status !== "cancelled").length;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CARE OPERATIONS</Text>
          <Text style={styles.title}>Scheduling</Text>
          <Text style={styles.subtitle}>Publish care work, manage Gloucester and Manchester coverage, and invite the right caregiver when a shift needs attention.</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.push("/post-shift")} style={styles.primaryAction}><Ionicons color="#FFFFFF" name="add-circle-outline" size={20} /><Text style={styles.primaryText}>Post shift</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/client-schedule")} style={styles.secondaryAction}><Ionicons color={colors.green} name="calendar-outline" size={20} /><Text style={styles.secondaryText}>Client schedule</Text></TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="radio-button-on-outline" label="Open" value={openCount} accent={colors.warning} />
          <StatCard icon="checkmark-circle-outline" label="Assigned" value={assignedCount} accent={colors.green} />
          <StatCard icon="flash-outline" label="Urgent" value={urgentCount} accent={colors.danger} />
        </View>

        <View style={styles.boardCard}>
          <View style={styles.boardHeader}>
            <View>
              <Text style={styles.boardTitle}>Shift board</Text>
              <Text style={styles.boardSubtitle}>Tap a shift to invite a caregiver or leave it open for pickup.</Text>
            </View>
            <View style={styles.boardIcon}><Ionicons color={colors.green} name="calendar-number-outline" size={23} /></View>
          </View>

          <Text style={styles.filterLabel}>Location</Text>
          <View style={styles.chips}>
            <Chip label="All locations" active={locationFilter === "All"} onPress={() => setLocationFilter("All")} />
            {locations.map((item) => <Chip key={item} label={item} active={locationFilter === item} onPress={() => setLocationFilter(item)} />)}
          </View>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.chips}>
            {statuses.map((item) => <Chip key={item} label={item} active={statusFilter === item} onPress={() => setStatusFilter(item)} />)}
          </View>
        </View>

        {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}
        {!loading && visibleShifts.length === 0 ? <View style={styles.empty}><Ionicons color={colors.green} name="calendar-clear-outline" size={34} /><Text style={styles.emptyTitle}>No shifts match this view</Text><Text style={styles.emptyBody}>Post a shift or change the filters to review all current care work.</Text></View> : null}
        {visibleShifts.map((shift) => <ShiftCard key={shift.id} shift={shift} onChanged={() => void load(true)} />)}
      </ScrollView>
      <EmployerTabBar />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: number; accent: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}><Ionicons color={accent} name={icon} size={21} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ShiftCard({ shift, onChanged }: { shift: Shift; onChanged: () => void }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const isOpen = shift.status === "open";
  const isActive = ["open", "assigned", "in_progress"].includes(shift.status);
  const statusColor = shift.status === "assigned" || shift.status === "in_progress" ? colors.green : shift.status === "cancelled" ? colors.muted : shift.urgency === "urgent" ? colors.danger : colors.warning;

  const cancel = () => Alert.alert("Cancel this shift?", "Caregivers connected to this shift will be notified immediately.", [
    { text: "Keep shift", style: "cancel" },
    { text: "Cancel shift", style: "destructive", onPress: async () => {
      try {
        await cancelEmployerShift(shift.id);
        onChanged();
      } catch (error) {
        Alert.alert("Shift not cancelled", error instanceof Error ? error.message : "Please try again.");
      }
    } },
  ]);

  const postForPickup = () => Alert.alert("Post remaining positions for pickup?", "Eligible, available caregivers will be notified and can claim an open position in the Caregiver app.", [
    { text: "Not now", style: "cancel" },
    { text: "Post for pickup", onPress: async () => {
      setPublishing(true);
      try {
        const result = await openEmployerShiftForPickup(shift.id);
        Alert.alert("Shift posted", `${result.matchedCaregivers} eligible caregiver${result.matchedCaregivers === 1 ? "" : "s"} notified.`, [{ text: "OK", onPress: onChanged }]);
      } catch (error) {
        Alert.alert("Could not post shift", error instanceof Error ? error.message : "Please try again.");
      } finally { setPublishing(false); }
    } },
  ]);

  return (
    <View style={styles.shiftCard}>
      <View style={styles.shiftTop}>
        <View style={styles.dateTile}>
          <Text style={styles.dateMonth}>{shiftDate(shift) === "Date pending" ? "—" : new Date(shift.startTime).toLocaleDateString("en-US", { month: "short" })}</Text>
          <Text style={styles.dateDay}>{shiftDate(shift) === "Date pending" ? "—" : new Date(shift.startTime).toLocaleDateString("en-US", { day: "numeric" })}</Text>
        </View>
        <View style={styles.shiftMain}>
          <View style={styles.shiftTitleRow}>
            <Text style={styles.shiftTitle} numberOfLines={2}>{shift.careRecipientName ? `${shift.careRecipientName} care visit` : shift.serviceType}</Text>
            <Text style={[styles.statusPill, { color: statusColor, backgroundColor: `${statusColor}15` }]}>{statusLabel(shift.status)}</Text>
          </View>
          <Text style={styles.shiftTime}>{shiftDate(shift)} · {shiftTime(shift)}</Text>
          <Text style={styles.shiftLocation}>{shift.location.city}, {shift.location.state}</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <Detail icon="people-outline" label="Coverage" value={`${shift.assignedCaregivers}/${shift.numberOfCaregivers} filled`} />
        <Detail icon={shift.assignmentMode === "instant" ? "flash-outline" : "shield-checkmark-outline"} label="Assignment" value={shift.assignmentMode === "instant" ? "Open pickup" : "Employer review"} />
      </View>

      <Text style={styles.description} numberOfLines={3}>{shift.responsibilities || "No responsibilities added yet."}</Text>

      {isActive ? (
        <View style={styles.cardActions}>
          {shift.remainingPositions > 0 ? (
            <TouchableOpacity onPress={() => router.push({ pathname: "/allocate-staff", params: { shiftId: String(shift.id) } })} style={styles.allocate}>
              <Ionicons color="#FFFFFF" name="person-add-outline" size={17} />
              <Text style={styles.allocateText}>Invite caregiver</Text>
            </TouchableOpacity>
          ) : null}
          {isOpen && shift.assignmentMode !== "instant" ? (
            <TouchableOpacity disabled={publishing} onPress={postForPickup} style={[styles.pickup, publishing && styles.disabled]}>
              {publishing ? <ActivityIndicator color={colors.green} size="small" /> : <Ionicons color={colors.green} name="megaphone-outline" size={17} />}
              <Text style={styles.pickupText}>{publishing ? "Posting…" : "Open for pickup"}</Text>
            </TouchableOpacity>
          ) : isOpen ? (
            <View style={styles.pickupBadge}><Ionicons color={colors.green} name="checkmark-circle-outline" size={16} /><Text style={styles.pickupBadgeText}>Published for pickup</Text></View>
          ) : null}
          <TouchableOpacity onPress={cancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function Detail({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons color={colors.green} name={icon} size={17} />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 42 },
  header: { marginBottom: 16 },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: colors.ink, fontSize: 34, fontWeight: "900", letterSpacing: -0.2, marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
  topActions: { flexDirection: "row", gap: 10, marginBottom: 14 },
  primaryAction: { alignItems: "center", backgroundColor: colors.green, borderRadius: 16, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 54 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  secondaryAction: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 54 },
  secondaryText: { color: colors.green, fontSize: 15, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 9, marginBottom: 14 },
  statCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 104, padding: 12 },
  statIcon: { alignItems: "center", borderRadius: 13, height: 38, justifyContent: "center", width: 38 },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: "900", marginTop: 9 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: 2 },
  boardCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 14, padding: 15 },
  boardHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  boardTitle: { color: colors.ink, fontSize: 22, fontWeight: "900" },
  boardSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3, maxWidth: 265 },
  boardIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 15, height: 44, justifyContent: "center", width: 44 },
  filterLabel: { color: colors.ink, fontSize: 12, fontWeight: "900", marginBottom: 8, marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.green, fontSize: 13, fontWeight: "900" },
  chipTextActive: { color: "#FFFFFF" },
  loader: { marginTop: 40 },
  empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 24 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 9 },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: "center" },
  shiftCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 12, padding: 15 },
  shiftTop: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  dateTile: { alignItems: "center", backgroundColor: colors.greenSoft, borderColor: "#D1E8DC", borderRadius: 17, borderWidth: 1, minHeight: 68, justifyContent: "center", width: 62 },
  dateMonth: { color: colors.green, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  dateDay: { color: colors.ink, fontSize: 24, fontWeight: "900", marginTop: 1 },
  shiftMain: { flex: 1 },
  shiftTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  shiftTitle: { color: colors.ink, flex: 1, fontSize: 18, fontWeight: "900", lineHeight: 23 },
  statusPill: { borderRadius: 999, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, textTransform: "uppercase" },
  shiftTime: { color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 6 },
  shiftLocation: { color: colors.muted, fontSize: 12, marginTop: 4 },
  detailGrid: { flexDirection: "row", gap: 9, marginTop: 14 },
  detail: { alignItems: "center", backgroundColor: "#F8FBF9", borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, minHeight: 56, paddingHorizontal: 10 },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  detailValue: { color: colors.ink, fontSize: 12, fontWeight: "900", marginTop: 2 },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  allocate: { alignItems: "center", backgroundColor: colors.green, borderRadius: 13, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 44, paddingHorizontal: 13 },
  allocateText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  pickup: { alignItems: "center", backgroundColor: colors.greenSoft, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 44, paddingHorizontal: 13 },
  pickupText: { color: colors.green, fontSize: 12, fontWeight: "900" },
  pickupBadge: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 13, flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 12 },
  pickupBadgeText: { color: colors.green, fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.6 },
  cancel: { alignItems: "center", borderColor: "#F1BBB6", borderRadius: 13, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 16 },
  cancelText: { color: colors.danger, fontSize: 12, fontWeight: "900" },
});
