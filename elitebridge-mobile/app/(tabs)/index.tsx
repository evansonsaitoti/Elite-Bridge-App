import { Redirect } from "expo-router";

/** Compatibility redirect for obsolete Home tab links. */
export default function LegacyHomeRedirect() {
  return <Redirect href="/(auth)/login" />;
}
