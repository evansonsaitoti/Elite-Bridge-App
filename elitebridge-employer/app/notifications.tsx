import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { EmployerNotification, getEmployerNotifications, markAllEmployerNotificationsRead, markEmployerNotificationRead } from "../lib/api";
import { colors } from "../lib/theme";

export default function NotificationsScreen() {
  const [items, setItems] = useState<EmployerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => { refresh ? setRefreshing(true) : setLoading(true); try { setItems(await getEmployerNotifications()); } catch (error) { Alert.alert("Unable to load notifications", error instanceof Error ? error.message : "Please try again."); } finally { setLoading(false); setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const read = async (item: EmployerNotification) => { if (item.is_read) return; try { await markEmployerNotificationRead(item.id); setItems((current) => current.map((value) => value.id === item.id ? { ...value, is_read: true } : value)); } catch {} };
  const readAll = async () => { try { await markAllEmployerNotificationsRead(); setItems((current) => current.map((item) => ({ ...item, is_read: true }))); } catch (error) { Alert.alert("Could not update notifications", error instanceof Error ? error.message : "Please try again."); } };
  return <SafeAreaView edges={["bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
    <View style={styles.header}><View><Text style={styles.title}>Updates</Text><Text style={styles.subtitle}>{items.filter((item) => !item.is_read).length} unread</Text></View>{items.some((item) => !item.is_read) ? <TouchableOpacity onPress={() => void readAll()}><Text style={styles.readAll}>Mark all read</Text></TouchableOpacity> : null}</View>
    {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}
    {!loading && items.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No updates yet</Text><Text style={styles.emptyBody}>Applications, claims, call-outs and account updates will appear here.</Text></View> : null}
    {items.map((item) => <TouchableOpacity key={item.id} onPress={() => void read(item)} style={[styles.card, !item.is_read && styles.unread]}><View style={[styles.dot, item.is_read && styles.dotRead]} /><View style={styles.copy}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text></View></TouchableOpacity>)}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, content: { padding: 20, paddingBottom: 42 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }, title: { color: colors.ink, fontSize: 27, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, readAll: { color: colors.green, fontSize: 12, fontWeight: "900" }, loader: { marginTop: 45 }, empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 26 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" }, emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: "center" }, card: { alignItems: "flex-start", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 11, marginBottom: 9, padding: 14 }, unread: { backgroundColor: colors.greenSoft, borderColor: "#B9DCCA" }, dot: { backgroundColor: colors.gold, borderRadius: 5, height: 10, marginTop: 5, width: 10 }, dotRead: { backgroundColor: colors.border }, copy: { flex: 1 }, cardTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" }, message: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, date: { color: colors.muted, fontSize: 10, marginTop: 8 } });
