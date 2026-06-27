import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { BrandHeader } from "../src/components/BrandHeader";
import { api } from "../src/api";
import { colors } from "../src/theme";

type Shift = {
  id: number;
  title: string;
  serviceType: string;
  startTime?: string;
  status: string;
  location?: { city?: string; state?: string };
  hourlyRate?: number;
};

function formatDate(value?: string) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function DashboardScreen() {
  const [user, setUser] = useState<any>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const storedUser = await api.getStoredUser();
    setUser(storedUser);
    const response = await api.getMyShifts().catch(() => ({ shifts: [] }));
    setShifts(response.shifts || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const signOut = async () => {
    await api.logout();
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <BrandHeader subtitle={`Welcome ${user?.firstName || "Employer"}`} />
        <Pressable onPress={signOut}><Text style={styles.signOut}>Sign Out</Text></Pressable>
      </View>

      <View style={styles.actions}>
        <Text style={styles.title}>Posted Shifts</Text>
        <Pressable style={styles.button} onPress={() => router.push("/post-shift")}>
          <Text style={styles.buttonText}>Post Shift</Text>
        </Pressable>
      </View>

      <FlatList
        data={shifts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No shifts posted yet. Tap Post Shift to create one.</Text>}
        renderItem={({ item }) => (
          <View style={styles.shiftCard}>
            <Text style={styles.shiftTitle}>{item.title}</Text>
            <Text style={styles.shiftMeta}>{item.serviceType} • {item.status}</Text>
            <Text style={styles.shiftMeta}>{formatDate(item.startTime)} • {[item.location?.city, item.location?.state].filter(Boolean).join(", ")}</Text>
            <Text style={styles.rate}>${item.hourlyRate || 0}/hr</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
  header: { backgroundColor: colors.white, padding: 20, gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  signOut: { color: colors.gold, fontWeight: "800" },
  actions: { padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontWeight: "800", color: colors.green },
  button: { backgroundColor: colors.gold, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  buttonText: { color: colors.white, fontWeight: "800" },
  list: { padding: 20, gap: 12 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 40, fontSize: 16 },
  shiftCard: { backgroundColor: colors.white, borderRadius: 18, padding: 18, gap: 6, borderWidth: 1, borderColor: colors.border },
  shiftTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  shiftMeta: { color: colors.muted },
  rate: { color: colors.gold, fontWeight: "800", marginTop: 4 },
});
