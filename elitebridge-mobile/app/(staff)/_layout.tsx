import * as Notifications from "expo-notifications";
import { caregiverNotificationRoute } from "@/lib/notification-route";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { enableCaregiverPushNotifications } from "@/lib/push-notifications";

const STAFF_TABS = [
  { label: "Home", route: "/(staff)/home", match: "/home", icon: "house.fill" },
  { label: "Shifts", route: "/(staff)/shifts", match: "/shifts", icon: "calendar" },
  { label: "Tasks", route: "/(staff)/handoff", match: "/handoff", icon: "checklist" },
  { label: "Clients", route: "/(staff)/clients", match: "/clients", icon: "person.2" },
  { label: "More", route: "/(staff)/more", match: "/more", icon: "square.grid.2x2" },
] as const;

export default function StaffLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const lastResponse = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("elitebridge-session")
      .then((stored) => {
        if (!mounted) return;
        if (!stored) { router.replace("/(root)"); return; }
        try {
          const session = JSON.parse(stored) as { role?: string };
          if (session.role !== "staff") {
            router.replace("/(root)");
            return;
          }
          void AsyncStorage.getItem("elitebridge-caregiver-settings-v1")
            .then((value) => {
              if (!value || JSON.parse(value)?.pushAlerts !== false) return enableCaregiverPushNotifications();
              return false;
            }).catch(() => false);
          setReady(true);
        } catch { router.replace("/(root)"); }
      })
      .catch(() => router.replace("/(root)"));
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const retry = async () => {
      try {
        const value = await AsyncStorage.getItem("elitebridge-caregiver-settings-v1");
        if (!value || JSON.parse(value)?.pushAlerts !== false) await enableCaregiverPushNotifications(false);
      } catch { /* Retry on the next foreground event; Profile can show registration errors. */ }
    };
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void retry();
    });
    return () => subscription.remove();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!mounted || !response) return;
      const id = response.notification.request.identifier;
      if (lastResponse.current === id) return;
      lastResponse.current = id;
      router.push(caregiverNotificationRoute(response.notification.request.content.data?.type));
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    let liveResponseReceived = false;
    const listener = Notifications.addNotificationResponseReceivedListener(response => {
      liveResponseReceived = true;
      open(response);
    });
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (!liveResponseReceived) open(response);
    }).catch(() => undefined);
    return () => { mounted = false; listener.remove(); };
  }, [ready, router]);

  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;

  // Pages using a plain ScrollView need the native status-bar inset;
  // screens using ScreenContainer or their own SafeAreaView already manage it.
  const needsTopInset = ["/home", "/shifts", "/handoff", "/clients", "/more",
    "/notifications", "/timesheets", "/opportunities", "/earnings"]
    .some(route => pathname.includes(route));

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flex: 1, paddingTop: needsTopInset ? insets.top : 0 }}><Slot /></View>
    <View style={{
      flexDirection: "row",
      minHeight: 61 + Math.max(insets.bottom, 8),
      marginHorizontal: 0,
      marginBottom: 0,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 6,
      borderRadius: 0,
      backgroundColor: colors.surface,
      shadowColor: "#101828",
      shadowOpacity: 0.05,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    }}>
      {STAFF_TABS.map((tab) => {
        const active = pathname.includes(tab.match);
        const tint = active ? colors.primary : colors.muted;
        return <Pressable key={tab.route} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.replace(tab.route)} style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1, transform: [{ translateY: active ? -2 : 0 }] })}>
          <View style={{ width: active ? 50 : 44, height: active ? 47 : 42, borderRadius: active ? 19 : 17, alignItems: "center", justifyContent: "center", backgroundColor: active ? "#FFFFFF" : "#EAF4EF", borderWidth: 1, borderColor: active ? colors.primary : "#D9E9E2" }}>
            <IconSymbol size={active ? 26 : 24} name={tab.icon} color={tint} />
          </View>
          <Text numberOfLines={1} style={{ marginTop: 3, fontSize: 10.5, fontWeight: active ? "900" : "700", color: tint }}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
