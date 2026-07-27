import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

/** Root role-based routing for the legacy auth context. */
export default function RootIndex() {
  const { user, loading, isAuthenticated } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = user?.role || "user";
  const onboardingCompleted = user?.onboardingCompleted || false;

  if (role === "admin") {
    return <Redirect href="/(admin)/home" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(staff)/home" />;
}
