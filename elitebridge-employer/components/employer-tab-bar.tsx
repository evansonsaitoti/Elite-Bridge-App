import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colors } from "../lib/theme";

const tabs = [
  { label: "Home", icon: "home-outline", activeIcon: "home", route: "/dashboard", match: "/dashboard" },
  { label: "Shifts", icon: "calendar-outline", activeIcon: "calendar", route: "/shifts", match: "/shifts" },
  { label: "Clients", icon: "briefcase-outline", activeIcon: "briefcase", route: "/clients", match: "/clients" },
  { label: "Caregivers", icon: "people-outline", activeIcon: "people", route: "/team", match: "/team" },
  { label: "More", icon: "grid-outline", activeIcon: "grid", route: "/account", match: "/account" },
] as const;

export function EmployerTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  return <View style={styles.bar}>{tabs.map((tab) => {
    const active = pathname.includes(tab.match);
    return <TouchableOpacity key={tab.route} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => router.replace(tab.route)} style={[styles.tab, active && styles.tabActive]}>
      <View style={[styles.iconTile, active && styles.iconTileActive]}>
        <Ionicons color={active ? colors.green : colors.muted} name={active ? tab.activeIcon : tab.icon} size={active ? 28 : 25} />
      </View>
      <Text style={[styles.label, active && styles.active]}>{tab.label}</Text>
    </TouchableOpacity>;
  })}</View>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", minHeight: 82, paddingBottom: 7, paddingTop: 8 },
  tab: { alignItems: "center", flex: 1, justifyContent: "center" },
  tabActive: { transform: [{ translateY: -2 }] },
  iconTile: { alignItems: "center", backgroundColor: colors.greenSoft, borderColor: colors.border, borderRadius: 18, borderWidth: 1, height: 46, justifyContent: "center", width: 46 },
  iconTileActive: { backgroundColor: colors.card, borderColor: colors.green, borderRadius: 20, height: 54, width: 54 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: 4 },
  active: { color: colors.green },
});
