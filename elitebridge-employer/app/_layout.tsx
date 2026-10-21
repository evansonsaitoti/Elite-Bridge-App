import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { colors } from "../lib/theme";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === "team_message") router.push("/messages");
      else if (data?.type === "care_handoff" || data?.type === "care_checklist") router.push("/handoffs");
      else if (data?.type === "timesheet_ready" || data?.type === "timesheet_review") router.push("/time");
      else if (data?.type === "shift_application" || data?.type === "shift_callout") router.push("/applications");
    });
    return () => sub.remove();
  }, [router]);
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.green,
          headerTitleStyle: { color: colors.ink, fontWeight: "800" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: "Employer sign in" }} />
        <Stack.Screen name="register" options={{ title: "Create employer account" }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="shifts" options={{ title: "Posted shifts" }} />
        <Stack.Screen name="clients" options={{ title: "Client records" }} />
        <Stack.Screen name="post-shift" options={{ title: "Post a shift" }} />
        <Stack.Screen name="client-schedule" options={{ title: "New client schedule" }} />
        <Stack.Screen name="allocate-staff" options={{ title: "Allocate staff" }} />
        <Stack.Screen name="applications" options={{ title: "Applications" }} />
        <Stack.Screen name="team" options={{ title: "Team directory" }} />
        <Stack.Screen name="time" options={{ title: "Time & attendance" }} />
        <Stack.Screen name="expenses" options={{ title: "Company expenses" }} />
        <Stack.Screen name="account" options={{ title: "Employer account" }} />
        <Stack.Screen name="profile" options={{ title: "Organization profile" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="messages" options={{ title: "Team messages" }} />
        <Stack.Screen name="handoffs" options={{ title: "Caregiver handoffs" }} />
        <Stack.Screen name="operations" options={{ title: "Care operations" }} />
      </Stack>
    </>
  );
}
