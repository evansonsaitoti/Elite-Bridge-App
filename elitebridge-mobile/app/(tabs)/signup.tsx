import { ScrollView, Text, View, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Signup Screen - User registration with role selection
 * Phase 2: Authentication implementation
 */
export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState<"role" | "details">("role");
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelect = (selectedRole: "user" | "admin") => {
    setRole(selectedRole);
    setStep("details");
    setError("");
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signup(email, password, name, role || "user");
      if (result.success) {
        router.replace("/(root)");
      } else {
        setError(result.error || "Signup failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "role") {
    return (
      <ScreenContainer className="p-4">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 justify-center gap-6">
            {/* Header */}
            <View className="items-center gap-2 mb-4">
              <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-2">
                <Text className="text-4xl">💼</Text>
              </View>
              <Text className="text-3xl font-bold text-foreground">Elite Bridge</Text>
              <Text className="text-sm text-muted">Choose your role to get started</Text>
            </View>

            {/* Role Selection */}
            <View className="gap-4">
              {/* User Role Card */}
              <TouchableOpacity
                onPress={() => handleRoleSelect("user")}
                className="bg-surface border-2 border-primary rounded-lg p-6 active:opacity-70"
              >
                <View className="gap-2">
                  <Text className="text-4xl mb-2">👤</Text>
                  <Text className="text-xl font-bold text-foreground">Staff Member</Text>
                  <Text className="text-sm text-muted">Browse and apply for shifts</Text>
                  <View className="mt-2 pt-2 border-t border-border">
                    <Text className="text-xs text-muted">✓ Find available shifts</Text>
                    <Text className="text-xs text-muted">✓ Track applications</Text>
                    <Text className="text-xs text-muted">✓ Manage profile</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Admin Role Card */}
              <TouchableOpacity
                onPress={() => handleRoleSelect("admin")}
                className="bg-surface border-2 border-border rounded-lg p-6 active:opacity-70"
              >
                <View className="gap-2">
                  <Text className="text-4xl mb-2">👨‍💼</Text>
                  <Text className="text-xl font-bold text-foreground">Administrator</Text>
                  <Text className="text-sm text-muted">Post shifts and manage staff</Text>
                  <View className="mt-2 pt-2 border-t border-border">
                    <Text className="text-xs text-muted">✓ Post and manage shifts</Text>
                    <Text className="text-xs text-muted">✓ Review applications</Text>
                    <Text className="text-xs text-muted">✓ Manage staff</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center gap-1 pt-4 border-t border-border">
              <Text className="text-muted">Already have an account?</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-primary font-semibold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center gap-6">
          {/* Header */}
          <View className="items-center gap-2 mb-4">
            <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-2">
              <Text className="text-4xl">{role === "admin" ? "👨‍💼" : "👤"}</Text>
            </View>
            <Text className="text-3xl font-bold text-foreground">Create Account</Text>
            <Text className="text-sm text-muted">
              Signing up as {role === "admin" ? "Administrator" : "Staff Member"}
            </Text>
          </View>

          {/* Signup Form */}
          <View className="gap-4">
            {/* Name Input */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Full Name</Text>
              <TextInput
                placeholder="John Doe"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                editable={!loading}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

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

            {/* Confirm Password Input */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Confirm Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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

            {/* Signup Button */}
            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              className="bg-primary rounded-lg p-4 items-center active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-background font-semibold text-lg">Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              onPress={() => {
                setStep("role");
                setRole(null);
                setError("");
              }}
              disabled={loading}
              className="items-center py-2"
            >
              <Text className="text-muted font-semibold">← Back to Role Selection</Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center gap-1 pt-4 border-t border-border">
            <Text className="text-muted">Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/login")} disabled={loading}>
              <Text className="text-primary font-semibold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
