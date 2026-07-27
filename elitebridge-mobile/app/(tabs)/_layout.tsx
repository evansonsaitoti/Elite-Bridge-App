import { Redirect } from "expo-router";

/**
 * Legacy Home/Login/Signup tab navigator.
 *
 * Older TestFlight builds and restored navigation state may still point to
 * /(tabs). Keep the route group as a compatibility bridge, but never render
 * the obsolete tab bar or legacy authentication screens.
 */
export default function LegacyTabsRedirect() {
  return <Redirect href="/(auth)/login" />;
}
