import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const ADMIN_TABS = [
  { label: "Dashboard", route: "/(admin)/home", match: "/home", icon: "house.fill" },
  { label: "Clients", route: "/(admin)/clients", match: "/clients", icon: "person.2.fill" },
  { label: "Operations", route: "/(admin)/operations", match: "/operations", icon: "briefcase.fill" },
  { label: "Timesheets", route: "/(admin)/timesheets", match: "/timesheets", icon: "clock.fill" },
] as const;

export default function AdminLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("elitebridge-session")
      .then((stored) => {
        if (!mounted) return;
        if (!stored) { router.replace("/(auth)/login"); return; }
        try {
          const session = JSON.parse(stored) as { role?: string };
          if (session.role !== "administrator") {
            router.replace(session.role === "staff" ? "/(staff)/home" : "/(auth)/login");
            return;
          }
          setReady(true);
        } catch { router.replace("/(auth)/login"); }
      })
      .catch(() => router.replace("/(auth)/login"));
    return () => { mounted = false; };
  }, [router]);

  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flex: 1 }}><Slot /></View>
    <View style={{ flexDirection: "row", minHeight: 62 + Math.max(insets.bottom, 8), paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.background }}>
      {ADMIN_TABS.map((tab) => {
        const active = pathname.includes(tab.match);
        const tint = active ? colors.primary : colors.muted;
        return <Pressable key={tab.route} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.replace(tab.route)} style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.65 : 1 })}>
          <IconSymbol size={23} name={tab.icon} color={tint} />
          <Text numberOfLines={1} style={{ marginTop: 4, fontSize: 10, fontWeight: active ? "800" : "600", color: tint }}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
