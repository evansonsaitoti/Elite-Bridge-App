import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getEmployerActivities, getStoredEmployer, ShiftActivity } from "../lib/api";
import { colors } from "../lib/theme";
import { EmployerTabBar } from "../components/employer-tab-bar";

export default function TimeScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<ShiftActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) return router.replace("/sign-in");
      setActivities(await getEmployerActivities());
    } catch (error) { Alert.alert("Unable to load attendance", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const latestByCaregiver = new Map<number, ShiftActivity>();
  for (const activity of activities) if (!latestByCaregiver.has(activity.caregiver_id)) latestByCaregiver.set(activity.caregiver_id, activity);
  const clockedIn = [...latestByCaregiver.values()].filter((activity) => activity.type === "clock_in").length;

  return <SafeAreaView edges={["bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
    <View style={styles.summary}><View><Text style={styles.summaryLabel}>CURRENT ATTENDANCE</Text><Text style={styles.summaryValue}>{clockedIn} clocked in</Text><Text style={styles.summaryBody}>Live activity from caregivers assigned through Elite Bridge shifts.</Text></View><View style={styles.clockIcon}><Ionicons color="#FFFFFF" name="time" size={27} /></View></View>
    <View style={styles.headingRow}><Text style={styles.heading}>Recent activity</Text><TouchableOpacity onPress={() => void load(true)}><Ionicons color={colors.green} name="refresh" size={21} /></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}
    {!loading && activities.length === 0 ? <View style={styles.empty}><Ionicons color={colors.green} name="time-outline" size={36} /><Text style={styles.emptyTitle}>No time activity yet</Text><Text style={styles.emptyBody}>Clock-ins and clock-outs from assigned caregiver visits will appear here automatically.</Text><TouchableOpacity onPress={() => router.push("/shifts")} style={styles.emptyButton}><Text style={styles.emptyButtonText}>View schedule</Text></TouchableOpacity></View> : null}
    {activities.map((activity) => {
      const isIn = activity.type === "clock_in";
      return <View key={activity.id} style={styles.card}><View style={[styles.activityIcon, isIn ? styles.inIcon : styles.outIcon]}><Ionicons color={isIn ? colors.green : colors.gold} name={isIn ? "log-in-outline" : "log-out-outline"} size={21} /></View><View style={styles.activityCopy}><Text style={styles.name}>{activity.first_name} {activity.last_name}</Text><Text style={styles.action}>{isIn ? "Clocked in" : activity.type === "clock_out" ? "Clocked out" : activity.type.replaceAll("_", " ")}</Text><Text style={styles.shift}>{activity.shift_title}</Text><Text style={styles.time}>{new Date(activity.timestamp).toLocaleString()}</Text></View></View>;
    })}
  </ScrollView><EmployerTabBar /></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { padding: 20, paddingBottom: 42 }, summary: { alignItems: "center", backgroundColor: colors.greenDark, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", padding: 17 }, summaryLabel: { color: "#D7A94B", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, summaryValue: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginTop: 5 }, summaryBody: { color: "#CEE2D8", fontSize: 11, lineHeight: 17, marginTop: 4, maxWidth: 260 }, clockIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 25, height: 50, justifyContent: "center", width: 50 }, headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 24 }, heading: { color: colors.ink, fontSize: 19, fontWeight: "900" }, loader: { marginTop: 45 }, empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 28 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 10 }, emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: "center" }, emptyButton: { borderColor: colors.green, borderRadius: 11, borderWidth: 1, marginTop: 16, paddingHorizontal: 18, paddingVertical: 11 }, emptyButtonText: { color: colors.green, fontWeight: "900" }, card: { alignItems: "flex-start", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", marginBottom: 9, padding: 14 }, activityIcon: { alignItems: "center", borderRadius: 12, height: 42, justifyContent: "center", marginRight: 12, width: 42 }, inIcon: { backgroundColor: colors.greenSoft }, outIcon: { backgroundColor: colors.warningSoft }, activityCopy: { flex: 1 }, name: { color: colors.ink, fontSize: 14, fontWeight: "900" }, action: { color: colors.green, fontSize: 12, fontWeight: "800", marginTop: 3, textTransform: "capitalize" }, shift: { color: colors.muted, fontSize: 11, marginTop: 5 }, time: { color: colors.muted, fontSize: 10, marginTop: 4 },
});
