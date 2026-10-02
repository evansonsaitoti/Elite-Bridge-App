import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Application, EmployerUser, getEmployerApplications, getEmployerShifts, getEmployerTeam, getStoredEmployer, Shift } from "../lib/api";
import { cardShadow, colors } from "../lib/theme";
import { enableEmployerPushNotifications } from "../lib/push-notifications";
import { EmployerTabBar } from "../components/employer-tab-bar";

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<EmployerUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [team, setTeam] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const stored = await getStoredEmployer();
      if (!stored) return router.replace("/sign-in");
      setUser(stored);
      void enableEmployerPushNotifications().catch(() => false);
      const [nextShifts, nextApplications, nextTeam] = await Promise.all([getEmployerShifts(), getEmployerApplications(), getEmployerTeam()]);
      setShifts(nextShifts);
      setApplications(nextApplications);
      setTeam(nextTeam.length);
    } catch (error) {
      Alert.alert("Unable to load workspace", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = shifts.filter((shift) => shift.status === "open").length;
  const pending = applications.filter((application) => application.status === "pending").length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
        <View style={styles.header}>
          <View><Text style={styles.brand}>ELITE BRIDGE EMPLOYER</Text><Text style={styles.greeting}>Hello{user?.firstName ? `, ${user.firstName}` : ""}</Text></View>
          <View style={styles.headerActions}><TouchableOpacity accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.bell}><Ionicons color={colors.green} name="notifications-outline" size={21} /></TouchableOpacity><TouchableOpacity accessibilityLabel="Employer account" onPress={() => router.push("/account")} style={styles.account}><Text style={styles.accountText}>{user?.firstName?.slice(0, 1).toUpperCase() || "E"}</Text></TouchableOpacity></View>
        </View>

        {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : (
          <>
            <View style={styles.commandHero}>
              <Text style={styles.heroKicker}>EMPLOYER COMMAND CENTER</Text>
              <Text style={styles.heroTitle}>Today's care priorities</Text>
              <Text style={styles.heroBody}>Post coverage, review applicants, manage caregivers, and keep client contract work easy to find.</Text>
              <View style={styles.heroActions}>
                <TouchableOpacity onPress={() => router.push("/post-shift")} style={styles.heroPrimary}><Ionicons color="#FFFFFF" name="add-circle-outline" size={18} /><Text style={styles.heroPrimaryText}>Post shift</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/clients")} style={styles.heroSecondary}><Ionicons color={colors.green} name="document-text-outline" size={18} /><Text style={styles.heroSecondaryText}>Contracts</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.priorityGrid}>
              <PriorityCard icon="calendar-outline" value={open} label="open shifts need coverage" urgent={open > 0} onPress={() => router.push("/shifts")} />
              <PriorityCard icon="person-add-outline" value={pending} label="caregiver applications" urgent={pending > 0} onPress={() => router.push("/applications")} />
              <PriorityCard icon="people-outline" value={team} label="active caregivers" onPress={() => router.push("/team")} />
              <PriorityCard icon="document-text-outline" value="Ready" label="client records and contracts" onPress={() => router.push("/clients")} />
            </View>

            <View style={styles.connected}><Text style={styles.connectedTitle}>Synced with Elite Bridge Caregiver</Text><Text style={styles.connectedBody}>Shifts posted here become available to eligible caregivers in the separate Caregiver app.</Text></View>

            <Text style={styles.sectionTitle}>Quick actions</Text>
            <NavCard icon="calendar-outline" title="Schedule and shifts" detail="Publish coverage, review assignments and manage upcoming work." value={shifts.length} onPress={() => router.push("/shifts")} />
            <NavCard icon="briefcase-outline" title="Client records and contracts" detail="Keep client details, care recipients, rates and contract tools in one place." onPress={() => router.push("/clients")} />
            <NavCard icon="people-outline" title="Caregiver directory" detail="See assigned caregivers, credentials and upcoming schedules." value={team} onPress={() => router.push("/team")} />
            <NavCard icon="person-add-outline" title="Hiring pipeline" detail="Review caregiver applicants and make assignment decisions." value={pending} onPress={() => router.push("/applications")} />
            <NavCard icon="time-outline" title="Time and attendance" detail="Monitor caregiver clock-ins and clock-outs from assigned visits." onPress={() => router.push("/time")} />
            <NavCard icon="settings-outline" title="Organization settings" detail="Manage your profile, notifications, privacy and support." onPress={() => router.push("/account")} />
          </>
        )}
      </ScrollView><EmployerTabBar />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function PriorityCard({ icon, value, label, urgent, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; value: number | string; label: string; urgent?: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={[styles.priorityCard, urgent && styles.priorityCardUrgent]}><View style={styles.priorityIcon}><Ionicons color={urgent ? colors.warning : colors.green} name={icon} size={20} /></View><Text style={styles.priorityValue}>{value}</Text><Text style={styles.priorityLabel}>{label}</Text></TouchableOpacity>;
}

function NavCard({ icon, title, detail, value, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; detail: string; value?: number; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={styles.navCard}><View style={styles.navIcon}><Ionicons color={colors.green} name={icon} size={22} /></View><View style={styles.navCopy}><Text style={styles.navTitle}>{title}</Text><Text style={styles.navDetail}>{detail}</Text></View>{typeof value === "number" ? <Text style={styles.count}>{value}</Text> : null}<Ionicons color={colors.green} name="chevron-forward" size={20} /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 }, content: { padding: 20, paddingBottom: 28 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 22 }, brand: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.6 }, greeting: { color: colors.ink, fontSize: 29, fontWeight: "900", marginTop: 5 },
  account: { alignItems: "center", backgroundColor: colors.green, borderRadius: 22, height: 44, justifyContent: "center", width: 44 }, accountText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 9 }, bell: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  commandHero: { ...cardShadow, backgroundColor: colors.greenDark, borderRadius: 24, marginBottom: 14, overflow: "hidden", padding: 18 }, heroKicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.7 }, heroTitle: { color: "#FFFFFF", fontSize: 27, fontWeight: "900", lineHeight: 32, marginTop: 8 }, heroBody: { color: "#D9E9E2", fontSize: 13, lineHeight: 20, marginTop: 8 }, heroActions: { flexDirection: "row", gap: 9, marginTop: 16 }, heroPrimary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48 }, heroSecondary: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48 }, heroPrimaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" }, heroSecondaryText: { color: colors.green, fontSize: 13, fontWeight: "900" },
  connected: { backgroundColor: colors.greenSoft, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 18, padding: 14 }, connectedTitle: { color: colors.green, fontSize: 14, fontWeight: "900" }, connectedBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  loader: { marginVertical: 50 }, stats: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 }, stat: { ...cardShadow, alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexBasis: "46%", flexGrow: 1, paddingHorizontal: 6, paddingVertical: 14 }, statValue: { color: colors.green, fontSize: 24, fontWeight: "900" }, statLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 4, textAlign: "center" },
  priorityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }, priorityCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexBasis: "47%", flexGrow: 1, minHeight: 118, padding: 14 }, priorityCardUrgent: { borderColor: "#F3C370" }, priorityIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 12, height: 36, justifyContent: "center", width: 36 }, priorityValue: { color: colors.ink, fontSize: 24, fontWeight: "900", marginTop: 12 }, priorityLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 3 },
  primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "900", marginBottom: 11, marginTop: 26 }, navCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: "row", marginBottom: 10, padding: 14 }, navIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 12, height: 42, justifyContent: "center", marginRight: 12, width: 42 }, navCopy: { flex: 1 }, navTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" }, navDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }, count: { backgroundColor: colors.greenSoft, borderRadius: 13, color: colors.green, fontSize: 12, fontWeight: "900", marginHorizontal: 8, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
});
