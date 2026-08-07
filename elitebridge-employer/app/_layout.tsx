import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { getAgencyProfile, getEmployerSession } from "../lib/employer-storage";

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
        if (!session) {
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
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: authScreen ? { display: "none" } : { minHeight: 64, paddingTop: 8, paddingBottom: 8, borderTopColor: "#EAECF0" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
        <Tabs.Screen name="clients" options={{ title: "Clients" }} />
        <Tabs.Screen name="workforce" options={{ title: "Team" }} />
        <Tabs.Screen name="operations" options={{ title: "Ops" }} />
        <Tabs.Screen name="coverage" options={{ href: null }} />
        <Tabs.Screen name="timesheets" options={{ href: null }} />
        <Tabs.Screen name="compliance" options={{ href: null }} />
        <Tabs.Screen name="ask-elite" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="setup" options={{ href: null }} />
      </Tabs>
    </>
  );
}
