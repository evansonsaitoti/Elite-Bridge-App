import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colors } from "../lib/theme";

const tabs = [
  { label: "Home", icon: "home-outline", activeIcon: "home", route: "/dashboard", match: "/dashboard" },
  { label: "Schedule", icon: "calendar-outline", activeIcon: "calendar", route: "/shifts", match: "/shifts" },
  { label: "Team", icon: "people-outline", activeIcon: "people", route: "/team", match: "/team" },
  { label: "Time", icon: "time-outline", activeIcon: "time", route: "/time", match: "/time" },
  { label: "More", icon: "grid-outline", activeIcon: "grid", route: "/account", match: "/account" },
] as const;

export function EmployerTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  return <View style={styles.bar}>{tabs.map((tab) => {
    const active = pathname.includes(tab.match);
    return <TouchableOpacity key={tab.route} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => router.replace(tab.route)} style={styles.tab}>
      <Ionicons color={active ? colors.green : colors.muted} name={active ? tab.activeIcon : tab.icon} size={22} />
      <Text style={[styles.label, active && styles.active]}>{tab.label}</Text>
    </TouchableOpacity>;
  })}</View>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", minHeight: 68, paddingBottom: 5, paddingTop: 7 },
  tab: { alignItems: "center", flex: 1, justifyContent: "center" },
  label: { color: colors.muted, fontSize: 10, fontWeight: "800", marginTop: 3 },
  active: { color: colors.green },
});
