import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { CaregiverNotification, fetchCaregiverNotifications, markAllCaregiverNotificationsRead, markCaregiverNotificationRead } from "@/lib/shared-api";

export default function CaregiverNotifications() {
  const colors = useColors();
  const [items, setItems] = useState<CaregiverNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try { setItems(await fetchCaregiverNotifications()); }
    catch (error) { Alert.alert("Unable to load alerts", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const read = async (item: CaregiverNotification) => {
    if (item.is_read) return;
    try { await markCaregiverNotificationRead(item.id); setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, is_read: true } : candidate)); }
    catch (error) { Alert.alert("Could not update alert", error instanceof Error ? error.message : "Please try again."); }
  };

  const readAll = async () => {
    try { await markAllCaregiverNotificationsRead(); setItems((current) => current.map((item) => ({ ...item, is_read: true }))); }
    catch (error) { Alert.alert("Could not update alerts", error instanceof Error ? error.message : "Please try again."); }
  };

  const unread = items.filter((item) => !item.is_read).length;
  return <ScreenContainer><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
    <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>LIVE AGENCY SYNC</Text><Text style={[styles.title, { color: colors.foreground }]}>Alerts</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're up to date"}</Text></View><View style={[styles.icon, { backgroundColor: colors.primary }]}><IconSymbol name="message.fill" size={25} color="#FFFFFF" /></View></View>
    {unread ? <TouchableOpacity onPress={() => void readAll()} style={styles.readAll}><Text style={[styles.readAllText, { color: colors.primary }]}>Mark all as read</Text></TouchableOpacity> : null}
    {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 70 }} /> : null}
    {!loading && items.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="message.fill" size={32} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No alerts yet</Text><Text style={[styles.emptyBody, { color: colors.muted }]}>Matched shifts, assignment decisions, schedule changes and timesheet updates will appear here.</Text></View> : null}
    {items.map((item) => <TouchableOpacity key={item.id} onPress={() => void read(item)} style={[styles.card, { backgroundColor: item.is_read ? colors.surface : "#EAF4EF", borderColor: item.is_read ? colors.border : "#B9DCCA" }]}>
      <View style={[styles.dot, { backgroundColor: item.is_read ? colors.border : "#C58A24" }]} /><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.message, { color: colors.muted }]}>{item.message}</Text><Text style={[styles.date, { color: colors.muted }]}>{new Date(item.created_at).toLocaleString()}</Text></View>
    </TouchableOpacity>)}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 128 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 14 }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3 }, title: { fontSize: 30, fontWeight: "900", marginTop: 4 }, subtitle: { fontSize: 13, marginTop: 4 }, icon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" }, readAll: { alignSelf: "flex-end", marginBottom: 12, padding: 6 }, readAllText: { fontSize: 12, fontWeight: "900" }, empty: { alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 28, marginTop: 16 }, emptyTitle: { fontSize: 18, fontWeight: "900", marginTop: 10 }, emptyBody: { fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 6 }, card: { flexDirection: "row", gap: 11, borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 9 }, dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 }, cardTitle: { fontSize: 14, fontWeight: "900" }, message: { fontSize: 12, lineHeight: 18, marginTop: 4 }, date: { fontSize: 10, marginTop: 8 } });
