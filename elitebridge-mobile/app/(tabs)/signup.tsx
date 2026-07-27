import { Redirect } from "expo-router";

/** Compatibility redirect for the retired self-signup screen. */
export default function LegacySignupRedirect() {
  return <Redirect href="/(auth)/login" />;
}
