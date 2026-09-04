import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { Application, EmployerUser, getEmployerApplications, getEmployerShifts, getStoredEmployer, Shift } from "../lib/api";
import { cardShadow, colors } from "../lib/theme";
import { enableEmployerPushNotifications } from "../lib/push-notifications";
import { EmployerTabBar } from "../components/employer-tab-bar";

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<EmployerUser | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const stored = await getStoredEmployer();
      if (!stored) return router.replace("/sign-in");
      setUser(stored);
      void enableEmployerPushNotifications().catch(() => false);
      const [nextShifts, nextApplications] = await Promise.all([getEmployerShifts(), getEmployerApplications()]);
      setShifts(nextShifts);
      setApplications(nextApplications);
    } catch (error) {
      Alert.alert("Unable to load workspace", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = shifts.filter((shift) => shift.status === "open").length;
  const assigned = shifts.filter((shift) => shift.status === "assigned").length;
  const pending = applications.filter((application) => application.status === "pending").length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
        <View style={styles.header}>
          <View><Text style={styles.brand}>ELITE BRIDGE EMPLOYER</Text><Text style={styles.greeting}>Hello{user?.firstName ? `, ${user.firstName}` : ""}</Text></View>
          <View style={styles.headerActions}><TouchableOpacity accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.bell}><Text style={styles.bellText}>●</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Employer account" onPress={() => router.push("/account")} style={styles.account}><Text style={styles.accountText}>{user?.firstName?.slice(0, 1).toUpperCase() || "E"}</Text></TouchableOpacity></View>
        </View>

        <View style={styles.connected}><Text style={styles.connectedTitle}>Connected to Elite Bridge Caregiver</Text><Text style={styles.connectedBody}>Shifts posted here become available to eligible caregivers in the separate Caregiver app.</Text></View>

        {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : (
          <>
            <View style={styles.stats}>
              <Stat value={open} label="Open shifts" />
              <Stat value={pending} label="Applications" />
              <Stat value={assigned} label="Assigned" />
            </View>

            <TouchableOpacity onPress={() => router.push("/post-shift")} style={styles.primary}><Text style={styles.primaryText}>＋ Post a new shift</Text></TouchableOpacity>

            <Text style={styles.sectionTitle}>Employer tools</Text>
            <NavCard title="Posted shifts" detail="View every opportunity your organization has published." value={shifts.length} onPress={() => router.push("/shifts")} />
            <NavCard title="Caregiver applications" detail="Review applicants and approve or decline applications." value={pending} onPress={() => router.push("/applications")} />
            <NavCard title="Account and support" detail="Manage access, privacy, support and account deletion." onPress={() => router.push("/account")} />
          </>
        )}
      </ScrollView><EmployerTabBar />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function NavCard({ title, detail, value, onPress }: { title: string; detail: string; value?: number; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={styles.navCard}><View style={styles.navCopy}><Text style={styles.navTitle}>{title}</Text><Text style={styles.navDetail}>{detail}</Text></View>{typeof value === "number" ? <Text style={styles.count}>{value}</Text> : null}<Text style={styles.chevron}>›</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 }, content: { padding: 20, paddingBottom: 28 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 22 }, brand: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.6 }, greeting: { color: colors.ink, fontSize: 29, fontWeight: "900", marginTop: 5 },
  account: { alignItems: "center", backgroundColor: colors.green, borderRadius: 22, height: 44, justifyContent: "center", width: 44 }, accountText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 9 }, bell: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: "center", width: 40 }, bellText: { color: colors.gold, fontSize: 16 },
  connected: { backgroundColor: colors.greenDark, borderRadius: 18, marginBottom: 18, padding: 16 }, connectedTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, connectedBody: { color: "#CEE2D8", fontSize: 12, lineHeight: 18, marginTop: 5 },
  loader: { marginVertical: 50 }, stats: { flexDirection: "row", gap: 9, marginBottom: 16 }, stat: { ...cardShadow, alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flex: 1, paddingHorizontal: 6, paddingVertical: 16 }, statValue: { color: colors.green, fontSize: 25, fontWeight: "900" }, statLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 4, textAlign: "center" },
  primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, justifyContent: "center", minHeight: 54 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "900", marginBottom: 11, marginTop: 26 }, navCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: "row", marginBottom: 10, padding: 15 }, navCopy: { flex: 1 }, navTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" }, navDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }, count: { backgroundColor: colors.greenSoft, borderRadius: 13, color: colors.green, fontSize: 12, fontWeight: "900", marginHorizontal: 8, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 }, chevron: { color: colors.green, fontSize: 27, fontWeight: "600" },
});
