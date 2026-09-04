import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { Application, getEmployerApplications, getStoredEmployer, updateApplication } from "../lib/api";
import { colors } from "../lib/theme";
import { EmployerTabBar } from "../components/employer-tab-bar";

export default function ApplicationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) return router.replace("/sign-in");
      setItems(await getEmployerApplications());
    } catch (error) { Alert.alert("Unable to load applications", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const decide = (item: Application, status: "approved" | "rejected") => {
    Alert.alert(status === "approved" ? "Approve caregiver?" : "Decline application?", status === "approved" ? "Approving assigns this caregiver and closes the shift to other applicants." : "The caregiver will no longer be considered for this shift.", [
      { text: "Cancel", style: "cancel" },
      { text: status === "approved" ? "Approve" : "Decline", style: status === "rejected" ? "destructive" : "default", onPress: async () => {
        setUpdating(item.id);
        try { await updateApplication(item.id, status); await load(true); }
        catch (error) { Alert.alert("Application not updated", error instanceof Error ? error.message : "Please try again."); }
        finally { setUpdating(null); }
      } },
    ]);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
      <View style={styles.notice}><Text style={styles.noticeTitle}>Employer decisions remain human</Text><Text style={styles.noticeBody}>Elite Bridge displays caregiver-submitted information. Your organization reviews and makes every selection.</Text></View>
      {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}
      {!loading && items.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No applications yet</Text><Text style={styles.emptyBody}>Applications from the Elite Bridge Caregiver app will appear here.</Text></View> : null}
      {items.map((item) => <View key={item.id} style={styles.card}><View style={styles.row}><Text style={styles.name}>{item.first_name} {item.last_name}</Text><Text style={[styles.status, item.status === "approved" ? styles.approved : item.status === "rejected" ? styles.rejected : styles.pending]}>{item.status.toUpperCase()}</Text></View><Text style={styles.shift}>{item.shift_title}</Text><Text style={styles.meta}>{new Date(item.start_time).toLocaleString()} · {item.city}, {item.state}</Text><Text style={styles.meta}>{item.email}</Text>{item.certifications?.length ? <Text style={styles.credentials}>Credentials: {item.certifications.join(", ")}</Text> : null}{item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}{item.status === "pending" ? <View style={styles.actions}><TouchableOpacity disabled={updating === item.id} onPress={() => decide(item, "rejected")} style={styles.decline}><Text style={styles.declineText}>Decline</Text></TouchableOpacity><TouchableOpacity disabled={updating === item.id} onPress={() => decide(item, "approved")} style={styles.approve}>{updating === item.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.approveText}>Approve</Text>}</TouchableOpacity></View> : null}</View>)}
    </ScrollView><EmployerTabBar /></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 42 }, notice: { backgroundColor: colors.greenSoft, borderRadius: 15, marginBottom: 15, padding: 14 }, noticeTitle: { color: colors.greenDark, fontSize: 14, fontWeight: "900" }, noticeBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, loader: { marginTop: 45 },
  empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 26 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" }, emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: "center" },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginBottom: 11, padding: 16 }, row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, name: { color: colors.ink, flex: 1, fontSize: 17, fontWeight: "900" }, status: { borderRadius: 9, fontSize: 9, fontWeight: "900", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 }, pending: { backgroundColor: colors.warningSoft, color: colors.warning }, approved: { backgroundColor: colors.greenSoft, color: colors.green }, rejected: { backgroundColor: colors.dangerSoft, color: colors.danger }, shift: { color: colors.green, fontSize: 14, fontWeight: "800", marginTop: 9 }, meta: { color: colors.muted, fontSize: 12, marginTop: 5 }, credentials: { color: colors.ink, fontSize: 12, marginTop: 9 }, note: { backgroundColor: colors.background, borderRadius: 10, color: colors.muted, fontSize: 12, fontStyle: "italic", lineHeight: 18, marginTop: 10, padding: 10 }, actions: { flexDirection: "row", gap: 9, marginTop: 14 }, decline: { alignItems: "center", borderColor: colors.danger, borderRadius: 11, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 45 }, declineText: { color: colors.danger, fontWeight: "900" }, approve: { alignItems: "center", backgroundColor: colors.green, borderRadius: 11, flex: 1, justifyContent: "center", minHeight: 45 }, approveText: { color: "#FFFFFF", fontWeight: "900" },
});
