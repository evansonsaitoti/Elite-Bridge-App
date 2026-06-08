import { Stack } from "expo-router";
import { OnboardingProvider } from "@/lib/onboarding-context";

/**
 * Onboarding Layout
 * Wraps all onboarding screens with OnboardingProvider for state management
 */
export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
