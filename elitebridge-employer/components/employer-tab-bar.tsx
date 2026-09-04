import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "../lib/theme";

const tabs = [
  { label: "Home", icon: "⌂", route: "/dashboard", match: "/dashboard" },
  { label: "Shifts", icon: "▣", route: "/shifts", match: "/shifts" },
  { label: "Applicants", icon: "♙", route: "/applications", match: "/applications" },
  { label: "Account", icon: "●", route: "/account", match: "/account" },
] as const;

export function EmployerTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  return <View style={styles.bar}>{tabs.map((tab) => {
    const active = pathname.includes(tab.match);
    return <TouchableOpacity key={tab.route} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => router.replace(tab.route)} style={styles.tab}>
      <Text style={[styles.icon, active && styles.active]}>{tab.icon}</Text>
      <Text style={[styles.label, active && styles.active]}>{tab.label}</Text>
    </TouchableOpacity>;
  })}</View>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", minHeight: 68, paddingBottom: 5, paddingTop: 7 },
  tab: { alignItems: "center", flex: 1, justifyContent: "center" },
  icon: { color: colors.muted, fontSize: 20, fontWeight: "900" },
  label: { color: colors.muted, fontSize: 10, fontWeight: "800", marginTop: 3 },
  active: { color: colors.green },
});
