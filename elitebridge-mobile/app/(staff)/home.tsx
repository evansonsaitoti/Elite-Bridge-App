import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSharedTimekeeping } from "@/hooks/use-shared-timekeeping";
import { captureClockLocation } from "@/lib/shared-api";
import { enableCaregiverPushNotifications } from "@/lib/push-notifications";

const GREEN = "#075B42";
const ACTIONS = [
  { label: "My Shifts", detail: "Today's and upcoming shifts", icon: "calendar", tint: "#E3EEFF", route: "/(staff)/shifts" },
  { label: "Tasks", detail: "Shared care checklists", icon: "checklist", tint: "#FFF1C9", route: "/(staff)/handoff" },
  { label: "Clients", detail: "Assigned client records", icon: "person.2", tint: "#FCE2E5", route: "/(staff)/clients" },
  { label: "Timesheet", detail: "View and generate hours", icon: "doc.text", tint: "#DDF8E4", route: "/(staff)/timesheets" },
  { label: "Care Notes", detail: "Handover to the next carer", icon: "note.text", tint: "#EFE5FF", route: "/(staff)/handoff" },
  { label: "Messages", detail: "Secure agency conversations", icon: "message", tint: "#E5F4E8", route: "/(staff)/chat" },
] as const;

export default function StaffHome() {
  const router = useRouter();
  const { ready, error, refresh, shifts, entries, clockIn, clockOut } = useSharedTimekeeping();
  const [working, setWorking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const active = entries.find((entry) => !entry.clockOutAt);
  const upcoming = [...shifts]
    .filter((shift) => new Date(shift.scheduledEnd).getTime() > Date.now())
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())[0];
  useFocusEffect(useCallback(() => { void enableCaregiverPushNotifications().catch(() => false); return () => {}; }, []));
  const reload = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };
  const doClockOut = async () => {
    if (!active || working) return;
    setWorking(true);
    try {
      const location = await captureClockLocation();
      await clockOut(active.id, "", location);
      Alert.alert("Clocked out", "Your completed shift and timesheet are now available to your agency.");
    } catch (cause) {
      Alert.alert("Unable to clock out", cause instanceof Error ? cause.message : "Try again.");
    } finally { setWorking(false); }
  };
  const onClock = async () => {
    if (working) return;
    if (!ready) { Alert.alert("Loading", "Your shifts are still being synchronized."); return; }
    if (error) { Alert.alert("Sync unavailable", error + ". Pull down to refresh before recording attendance."); return; }
    if (active) {
      Alert.alert("Before you clock out", "Check the shared Tasks list, leave any handover notes, and confirm your visit is finished. Outstanding tasks do not prevent clock-out.", [
        { text: "Review tasks", onPress: () => router.push("/(staff)/handoff") },
        { text: "Cancel", style: "cancel" },
        { text: "Clock Out", onPress: () => void doClockOut() },
      ]);
      return;
    }
    if (!upcoming) { Alert.alert("No assigned shift", "Shared care-site tasks are separate from staff assignments. Your employer must assign a shift in Elite Work before you can clock in.", [{ text: "View shifts", onPress: () => router.push("/(staff)/shifts") }, { text: "OK" }]); return; }
    setWorking(true);
    try {
      const location = await captureClockLocation();
      await clockIn(upcoming, null, location);
      Alert.alert("Clocked in", "Your attendance is recorded in the shared Elite Bridge system.");
    } catch (cause) {
      Alert.alert("Unable to clock in", cause instanceof Error ? cause.message : "Try again.");
    } finally { setWorking(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F9F6" }} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 }}>
        <Image source={require("../../assets/images/elitebridge-logo.png")} style={{ width: 52, height: 52, borderRadius: 15 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#064732", fontSize: 27, fontWeight: "900" }}>Elite Care</Text>
          <Text style={{ color: "#65746B", fontSize: 13, fontWeight: "700" }}>Caregiver workspace</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/(staff)/notifications")} style={{ backgroundColor: "#FFFFFF", borderRadius: 17, borderColor: "#D7E5DD", borderWidth: 1, width: 49, height: 49, alignItems: "center", justifyContent: "center" }}>
          <IconSymbol name="bell" size={26} color="#075B42" />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Menu and profile" onPress={() => router.push("/(staff)/more")} style={{ backgroundColor: "#FFFFFF", borderRadius: 17, borderColor: "#D7E5DD", borderWidth: 1, width: 49, height: 49, alignItems: "center", justifyContent: "center" }}>
          <IconSymbol name="line.3.horizontal" size={26} color="#075B42" />
        </TouchableOpacity>
      </View>

      <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: "#FFFFFF", borderColor: "#DFE9E3", borderWidth: 1, marginBottom: 13 }}>
        <Image source={require("../../assets/images/caregiver-welcome-hero.jpg")} style={{ width: "100%", height: 123 }} resizeMode="cover" accessibilityLabel="Caregiver providing compassionate care" />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 19, fontWeight: "900", color: "#07503B" }}>Ready for today's care?</Text>
          <Text style={{ color: "#66776E", fontSize: 13, marginTop: 4 }}>Your work makes a difference every day.</Text>
        </View>
      </View>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel={active ? "Clock Out" : "Clock In"}
        disabled={working} onPress={() => void onClock()}
        style={{ minHeight: 59, borderRadius: 40, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, opacity: working ? 0.7 : 1 }}>
        {working ? <ActivityIndicator color="#FFFFFF" /> : <IconSymbol name="timer" size={29} color="#FFFFFF" />}
        <Text style={{ fontSize: 20, color: "#FFFFFF", fontWeight: "800" }}>{working ? "Saving…" : active ? "Clock Out" : "Clock In"}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/clock")}
        style={{ borderRadius: 19, backgroundColor: "#EAF4EF", borderColor: "#D8E8DE", borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginTop: 9, marginBottom: 15, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconSymbol name="clock" size={26} color={GREEN} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: "#163D2E", fontWeight: "800" }}>{!ready ? "Loading shift…" : error ? "Agency sync needs attention" : active ? "Shift in progress" : upcoming ? "Not clocked in" : "No assigned shift"}</Text>
          <Text style={{ color: "#62796C", fontSize: 12, marginTop: 3 }}>{error || (active ? "Tap for breaks, notes and time records" : upcoming ? "Tap to view your next shift" : "View your schedule and time records")}</Text>
        </View>
        <IconSymbol name="chevron.right" size={17} color="#62796C" />
      </TouchableOpacity>

      <Text style={{ color: "#152923", fontWeight: "900", fontSize: 22, marginBottom: 12 }}>Quick actions</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {ACTIONS.map((item) => (
          <TouchableOpacity key={item.label} accessibilityRole="button" accessibilityLabel={item.label}
            onPress={() => router.push(item.route)}
            style={{ width: "48.2%", minHeight: 151, borderRadius: 20, padding: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DFE9E3" }}>
            <View style={{ backgroundColor: item.tint, borderRadius: 17, width: 57, height: 57, justifyContent: "center", alignItems: "center", marginBottom: 11 }}>
              <IconSymbol name={item.icon} size={29} color={GREEN} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#16251E" }}>{item.label}</Text>
            <Text style={{ color: "#61736A", fontSize: 12, marginTop: 5, lineHeight: 18 }}>{item.detail}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
