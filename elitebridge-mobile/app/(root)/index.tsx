import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

/** Root routing for the caregiver-only Elite Bridge app. */
export default function RootIndex() {
  const { loading, isAuthenticated, user } = useAuth();
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

  if (!user?.onboardingCompleted) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(staff)/home" />;
}
