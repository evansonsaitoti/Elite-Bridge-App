import { ScrollView, Text, View, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Login Screen - Email/password authentication
 * Phase 2: Authentication implementation
 */
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Call login function from auth hook
      const result = await login(email, password);
      if (result.success) {
        // Navigation handled by useEffect in root layout
        router.replace("/(root)");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center gap-6">
          {/* Logo Section */}
          <View className="items-center gap-2 mb-4">
            <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-2">
              <Text className="text-4xl">💼</Text>
            </View>
            <Text className="text-3xl font-bold text-foreground">Elite Bridge</Text>
            <Text className="text-sm text-muted">Staffing Made Simple</Text>
          </View>

          {/* Login Form */}
          <View className="gap-4">
            {/* Email Input */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Email Address</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

            {/* Password Input */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

            {/* Error Message */}
            {error && (
              <View className="bg-error rounded-lg p-3">
                <Text className="text-background text-sm">{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-primary rounded-lg p-4 items-center active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-background font-semibold text-lg">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity className="items-center py-2 active:opacity-70">
              <Text className="text-primary font-semibold">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Signup Link */}
          <View className="flex-row justify-center gap-1 pt-4 border-t border-border">
            <Text className="text-muted">Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/signup")} disabled={loading}>
              <Text className="text-primary font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
