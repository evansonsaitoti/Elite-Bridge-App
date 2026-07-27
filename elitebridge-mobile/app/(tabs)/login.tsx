import { Redirect } from "expo-router";

/**
 * Legacy login route retained for old builds and deep links.
 * All authentication now uses the role-based Administrator/Staff portal.
 */
export default function LegacyLoginRedirect() {
  return <Redirect href="/(auth)/login" />;
}
