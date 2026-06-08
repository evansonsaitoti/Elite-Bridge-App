import { Stack } from "expo-router";

/**
 * Root Layout - Renders the Stack navigator
 * Navigation is handled by the root/index.tsx screen
 */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
