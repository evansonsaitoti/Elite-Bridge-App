import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Application, EmployerUser, getEmployerApplications, getEmployerShifts, getEmployerTeam, getStoredEmployer, Shift } from "../lib/api";
import { cardShadow, colors } from "../lib/theme";
import { enableEmployerPushNotifications } from "../lib/push-notifications";
import { EmployerTabBar } from "../components/employer-tab-bar";

const quickActions: {
  title: string;
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  background: string;
  route: string;
}[] = [
  { title: "Post a shift", detail: "Create a care opportunity", icon: "calendar-outline", tint: colors.green, background: "#DDF4F1", route: "/post-shift" },
  { title: "Client record", detail: "Prepare care details", icon: "heart-circle-outline", tint: colors.green, background: "#FFF1C9", route: "/clients" },
  { title: "Add expense", detail: "Gas, ads, receipts", icon: "receipt-outline", tint: colors.green, background: "#F7E4D4", route: "/expenses" },
  { title: "Invite caregiver", detail: "Send signup link", icon: "people-outline", tint: colors.green, background: "#E7F3DC", route: "/team" },
  { title: "Timesheets", detail: "Review missed clock-ins", icon: "time-outline", tint: colors.green, background: "#EAE4FF", route: "/time" },
  { title: "Invoices", detail: "Bill clients", icon: "document-text-outline", tint: colors.green, background: "#FFF1C9", route: "/invoices" },
];

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
  const assigned = shifts.filter((shift) => shift.status === "assigned" || shift.status === "in_progress").length;
  const pending = applications.filter((application) => application.status === "pending").length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.replace("/dashboard")} style={styles.logoRow}>
            <Image source={require("../assets/images/icon.png")} resizeMode="cover" style={styles.logo} accessibilityLabel="Elite Bridge logo" />
            <View>
              <Text style={styles.brand}>Elite Bridge</Text>
              <Text style={styles.workspace}>Employer workspace</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.headerButton}>
              <Ionicons color={colors.green} name="notifications-outline" size={24} />
              {pending > 0 ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Menu" onPress={() => router.push("/account")} style={styles.headerButton}>
              <Ionicons color={colors.green} name="menu-outline" size={28} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : (
          <>
            <View style={styles.welcomeCard}>
              <Text style={styles.kicker}>TODAY</Text>
              <Text style={styles.welcomeTitle}>Welcome back{user?.firstName ? `, ${user.firstName}` : ""}.</Text>
              <Text style={styles.welcomeBody}>Manage coverage, clients, caregivers, expenses and review work from one clean dashboard.</Text>
            </View>

            <View style={styles.summaryRow}>
              <SummaryPill icon="calendar-outline" value={open} label="open shifts" urgent={open > 0} onPress={() => router.push("/shifts")} />
              <SummaryPill icon="checkmark-circle-outline" value={assigned} label="assigned" onPress={() => router.push("/shifts")} />
              <SummaryPill icon="people-outline" value={team} label="caregivers" onPress={() => router.push("/team")} />
            </View>

            <View style={styles.quickHeader}>
              <View>
                <Text style={styles.sectionTitle}>Quick actions</Text>
                <Text style={styles.sectionSubtitle}>Move care operations forward</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/applications")} style={styles.reviewPill}>
                <Text style={styles.reviewText}>{pending} to review</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionGrid}>
              {quickActions.map((action) => <QuickAction key={action.title} action={action} onPress={() => router.push(action.route as never)} />)}
            </View>

            <View style={styles.connected}>
              <View style={styles.connectedIcon}><Ionicons color={colors.green} name="link-outline" size={22} /></View>
              <View style={styles.connectedCopy}>
                <Text style={styles.connectedTitle}>Employer and Caregiver apps are connected</Text>
                <Text style={styles.connectedBody}>Posted shifts, invites, applications, clock-ins and timesheets sync through the shared Elite Bridge service.</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <EmployerTabBar />
    </SafeAreaView>
  );
}

function SummaryPill({ icon, value, label, urgent, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; value: number | string; label: string; urgent?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.summaryPill, urgent && styles.summaryUrgent]}>
      <View style={styles.summaryIcon}><Ionicons color={urgent ? colors.warning : colors.green} name={icon} size={21} /></View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function QuickAction({ action, onPress }: { action: typeof quickActions[number]; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.actionCard}>
      <View style={[styles.actionIcon, { backgroundColor: action.background }]}>
        <Ionicons color={action.tint} name={action.icon} size={36} />
      </View>
      <Text style={styles.actionTitle}>{action.title}</Text>
      <Text style={styles.actionDetail}>{action.detail}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { padding: 18, paddingBottom: 34 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  logoRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  logo: { borderRadius: 15, height: 48, width: 48 },
  brand: { color: colors.greenDark, fontSize: 21, fontWeight: "900", lineHeight: 24 },
  workspace: { color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: 1 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 9 },
  headerButton: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, height: 48, justifyContent: "center", position: "relative", width: 48 },
  dot: { backgroundColor: "#EF5B62", borderColor: "#FFFFFF", borderRadius: 5, borderWidth: 2, height: 11, position: "absolute", right: 10, top: 10, width: 11 },
  loader: { marginVertical: 54 },
  welcomeCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginBottom: 14, padding: 17 },
  kicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  welcomeTitle: { color: colors.ink, fontSize: 27, fontWeight: "900", lineHeight: 32, marginTop: 6 },
  welcomeBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  summaryRow: { flexDirection: "row", gap: 9, marginBottom: 18 },
  summaryPill: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 106, padding: 12 },
  summaryUrgent: { borderColor: "#F2C58A" },
  summaryIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 13, height: 40, justifyContent: "center", width: 40 },
  summaryValue: { color: colors.ink, fontSize: 23, fontWeight: "900", marginTop: 10 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: 2 },
  quickHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: 11 },
  sectionTitle: { color: colors.ink, fontSize: 23, fontWeight: "900" },
  sectionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  reviewPill: { backgroundColor: colors.greenSoft, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  reviewText: { color: colors.green, fontSize: 11, fontWeight: "900" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  actionCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, flexBasis: "47%", flexGrow: 1, minHeight: 156, padding: 15 },
  actionIcon: { alignItems: "center", borderColor: "rgba(11,90,65,0.08)", borderRadius: 23, borderWidth: 1, height: 72, justifyContent: "center", marginBottom: 15, width: 72 },
  actionTitle: { color: colors.ink, fontSize: 17, fontWeight: "900", lineHeight: 21 },
  actionDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  connected: { alignItems: "flex-start", backgroundColor: "#F8FBF9", borderColor: colors.border, borderRadius: 19, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 },
  connectedIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  connectedCopy: { flex: 1 },
  connectedTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  connectedBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
