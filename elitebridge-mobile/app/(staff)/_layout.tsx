import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { enableCaregiverPushNotifications } from "@/lib/push-notifications";

const STAFF_TABS = [
  {
    label: "Shifts",
    route: "/(staff)/home",
    match: "/home",
    icon: "briefcase.fill",
    accent: "#067647",
    soft: "#ECFDF3",
  },
  {
    label: "Care Match",
    route: "/(staff)/match",
    match: "/match",
    icon: "sparkles",
    accent: "#B54708",
    soft: "#FFF4E5",
  },
  {
    label: "Time",
    route: "/(staff)/clock",
    match: "/clock",
    icon: "clock.fill",
    accent: "#175CD3",
    soft: "#EFF8FF",
  },
  {
    label: "Alerts",
    route: "/(staff)/notifications",
    match: "/notifications",
    icon: "bell.fill",
    accent: "#C11574",
    soft: "#FDF2FA",
  },
  {
    label: "Me",
    route: "/(staff)/profile",
    match: "/profile",
    icon: "person.crop.circle.fill",
    accent: "#344054",
    soft: "#F2F4F7",
  },
] as const;

export default function StaffLayout() {
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
        if (!stored) {
          router.replace("/(root)");
          return;
        }
        try {
          const session = JSON.parse(stored) as { role?: string };
          if (session.role !== "staff") {
            router.replace("/(root)");
            return;
          }
          void enableCaregiverPushNotifications().catch(() => false);
          setReady(true);
        } catch {
          router.replace("/(root)");
        }
      })
      .catch(() => router.replace("/(root)"));
    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );

  const needsTopInset = pathname.includes("/home");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingTop: needsTopInset ? insets.top : 0 }}>
        <Slot />
      </View>
      <View
        style={{
          flexDirection: "row",
          minHeight: 76 + Math.max(insets.bottom, 8),
          marginHorizontal: 14,
          marginBottom: Math.max(insets.bottom, 8),
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 28,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          shadowColor: "#101828",
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        {STAFF_TABS.map((tab) => {
          const active = pathname.includes(tab.match);
          const tint = active ? tab.accent : colors.muted;
          return (
            <Pressable
              key={tab.route}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => router.replace(tab.route)}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
                transform: [{ translateY: active ? -2 : 0 }],
              })}
            >
              <View
                style={{
                  width: active ? 46 : 38,
                  height: 34,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? tab.soft : "#F9FAFB",
                  borderWidth: 1,
                  borderColor: active ? `${tab.accent}33` : "#EAECF0",
                }}
              >
                <IconSymbol
                  size={active ? 22 : 20}
                  name={tab.icon}
                  color={tint}
                />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 4,
                  fontSize: 10.5,
                  fontWeight: active ? "900" : "700",
                  color: tint,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
