import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0A4A35",
          tabBarInactiveTintColor: "#667085",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
          tabBarStyle: { minHeight: 64, paddingTop: 8, paddingBottom: 8, borderTopColor: "#EAECF0" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
        <Tabs.Screen name="clients" options={{ title: "Clients" }} />
        <Tabs.Screen name="workforce" options={{ title: "Team" }} />
        <Tabs.Screen name="operations" options={{ title: "Ops" }} />
        <Tabs.Screen name="coverage" options={{ href: null }} />
        <Tabs.Screen name="timesheets" options={{ href: null }} />
      </Tabs>
    </>
  );
}
