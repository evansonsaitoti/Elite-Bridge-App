import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "../lib/theme";

export default function RootLayout() {
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
        <Stack.Screen name="post-shift" options={{ title: "Post a shift" }} />
        <Stack.Screen name="applications" options={{ title: "Applications" }} />
        <Stack.Screen name="account" options={{ title: "Employer account" }} />
      </Stack>
    </>
  );
}
