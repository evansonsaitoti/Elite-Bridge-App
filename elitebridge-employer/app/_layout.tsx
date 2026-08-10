import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { getAgencyProfile, getEmployerSession } from "../lib/employer-storage";

const TAB_ICONS: Record<string, string> = {
  index: "⌂",
  schedule: "◫",
  operations: "◎",
  "ask-elite": "✦",
};

function TabIcon({ route, focused, color }: { route: string; focused: boolean; color: string }) {
  return (
    <View
      style={{
        width: focused ? 42 : 34,
        height: 30,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "#EAF4EF" : "transparent",
        borderWidth: focused ? 1 : 0,
        borderColor: focused ? "#CDE7DB" : "transparent",
        transform: [{ translateY: focused ? -2 : 0 }],
      }}
    >
      <Text style={{ color, fontSize: focused ? 22 : 19, fontWeight: "900" }}>
        {TAB_ICONS[route] ?? "•"}
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    Promise.all([getEmployerSession(), getAgencyProfile()])
      .then(([session, agency]) => {
        if (!active) return;
        if (!session && pathname !== "/setup") {
          if (pathname !== "/login") router.replace("/login");
        } else if (!agency && pathname !== "/setup") {
          router.replace("/setup");
        } else if (agency && pathname === "/login") {
          router.replace("/");
        }
      })
      .finally(() => active && setReady(true));
    return () => { active = false; };
  }, [pathname, router]);

  if (!ready) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F9F8" }}><ActivityIndicator size="large" color="#0A4A35" /></View>;
  }

  const authScreen = pathname === "/login" || pathname === "/setup";

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0A4A35",
          tabBarInactiveTintColor: "#667085",
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: "900", marginTop: 2 },
          tabBarItemStyle: { paddingVertical: 6 },
          tabBarStyle: authScreen ? { display: "none" } : {
            minHeight: 76,
            paddingTop: 8,
            paddingBottom: 12,
            marginHorizontal: 14,
            marginBottom: 10,
            borderTopWidth: 0,
            borderRadius: 28,
            backgroundColor: "#FFFFFF",
            shadowColor: "#101828",
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ focused, color }) => <TabIcon route="index" focused={focused} color={color} /> }} />
        <Tabs.Screen name="schedule" options={{ title: "Schedule", tabBarIcon: ({ focused, color }) => <TabIcon route="schedule" focused={focused} color={color} /> }} />
        <Tabs.Screen name="operations" options={{ title: "Ops", tabBarIcon: ({ focused, color }) => <TabIcon route="operations" focused={focused} color={color} /> }} />
        <Tabs.Screen name="ask-elite" options={{ title: "Elite", tabBarIcon: ({ focused, color }) => <TabIcon route="ask-elite" focused={focused} color={color} /> }} />
        <Tabs.Screen name="clients" options={{ href: null }} />
        <Tabs.Screen name="workforce" options={{ href: null }} />
        <Tabs.Screen name="coverage" options={{ href: null }} />
        <Tabs.Screen name="timesheets" options={{ href: null }} />
        <Tabs.Screen name="applications" options={{ href: null }} />
        <Tabs.Screen name="compliance" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="setup" options={{ href: null }} />
      </Tabs>
    </>
  );
}
