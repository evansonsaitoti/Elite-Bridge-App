import { useEffect } from "react";
import { Redirect, useRouter } from "expo-router";
import { Platform } from "react-native";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { USER_INFO_KEY } from "@/constants/oauth";

/**
 * Home Screen - Redirects to demo app
 * For demo/preview purposes, automatically logs in and shows the user app
 */
export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Auto-login for demo purposes
    const initDemo = async () => {
      // Always set demo user to staff for web preview (clears any cached admin user)
      const demoUser = {
        id: 2,
        openId: "demo_staff_001",
        name: "Sarah Johnson",
        email: "sarah@elitebridge.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
        role: "staff",
      };
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(demoUser));

      // Navigate to root which will handle role-based routing
      router.replace("/(root)");
    };
    initDemo();
  }, [router]);

  // Native users must see the sign-in screen. Redirecting to /(root) here
  // creates a loop with the unauthenticated redirect in /(root)/index.
  if (Platform.OS !== "web") {
    return <Redirect href="/(tabs)/login" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
