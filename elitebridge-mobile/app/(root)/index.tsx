import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * Root Index Screen - Handles role-based navigation
 * This screen is mounted after the navigation tree is ready,
 * so we can safely use router.replace() or Redirect
 */
export default function RootIndex() {
  const { user, loading, isAuthenticated } = useAuth();
  const colors = useColors();

  // Show loading state while determining role
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Redirect href="/(tabs)/login" />;
  }

  // Authenticated - route based on role and onboarding status
  const role = user?.role || "user";
  const onboardingCompleted = user?.onboardingCompleted || false;

  if (role === "admin") {
    return <Redirect href="/(admin)/home" />;
  } else if (role === "staff" || role === "user") {
    // Check if staff member has completed onboarding
    if (!onboardingCompleted) {
      return <Redirect href="/(onboarding)/welcome" />;
    } else {
      return <Redirect href="/(staff)/home" />;
    }
  } else {
    // Default to staff for user role
    return <Redirect href="/(staff)/home" />;
  }
}
