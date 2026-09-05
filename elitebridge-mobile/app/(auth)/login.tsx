import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ensureCaregiverBackendSession, sharedApiConfigured } from "@/lib/shared-api";
import { enableCaregiverPushNotifications } from "@/lib/push-notifications";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter both your email address and password.");
      return;
    }
    if (!sharedApiConfigured) {
      setError("Elite Bridge cannot reach the secure agency service in this build.");
      return;
    }

    try {
      setIsLoading(true);
      const user = await ensureCaregiverBackendSession(email, password);
      await AsyncStorage.setItem("elitebridge-session", JSON.stringify({
        role: "staff",
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        signedInAt: new Date().toISOString(),
      }));
      await enableCaregiverPushNotifications().catch(() => false);
      router.replace("/(staff)/home");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not sign you in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <Image source={require("../../assets/images/elitebridge-logo.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="Elite Bridge logo" />
            <Text style={styles.slogan}>ELITE BRIDGE</Text>
            <Text style={styles.caregiverLabel}>CAREGIVER APP</Text>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>YOUR WORKDAY, ONE PLACE</Text>
            <Text style={styles.heroTitle}>Ready for your next shift?</Text>
            <Text style={styles.heroBody}>Sign in to view assignments, manage availability, track visits and keep your care day organized.</Text>
          </View>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign in</Text>
            <Text style={styles.formSubtitle}>Use the caregiver account connected to your agency.</Text>

            <Text style={styles.label}>Email address</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" editable={!isLoading} placeholder="caregiver@example.com" placeholderTextColor="#98A2B3" />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.passwordInput} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} textContentType="password" editable={!isLoading} placeholder="Enter password" placeholderTextColor="#98A2B3" onSubmitEditing={() => void handleLogin()} />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.showButton}><Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text></TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Sign in to Caregiver</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signupButton} onPress={() => router.push("/(onboarding)/welcome")} disabled={isLoading}>
              <Text style={styles.signupButtonText}>New caregiver? Create profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accessBox}>
            <Text style={styles.accessTitle}>Caregiver access only</Text>
            <Text style={styles.accessText}>Agency administrators should use the separate Elite Bridge Employer app.</Text>
          </View>

          <Text style={styles.securityHint}>Secure agency sync</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: 20, paddingBottom: 40, backgroundColor: "#F7FAF8" },
  brandBlock: { alignItems: "center", marginBottom: 16 },
  logo: { width: 104, height: 104, alignSelf: "center" },
  slogan: { textAlign: "center", color: "#0A4A35", fontSize: 20, fontWeight: "900", letterSpacing: 1.2 },
  caregiverLabel: { marginTop: 4, textAlign: "center", color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 2.2 },
  heroCard: { marginBottom: 16, padding: 20, borderRadius: 22, backgroundColor: "#0A4A35" },
  heroEyebrow: { color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: { marginTop: 7, color: "#FFFFFF", fontSize: 26, fontWeight: "900", lineHeight: 31 },
  heroBody: { marginTop: 8, color: "#D9E9E2", fontSize: 14, lineHeight: 20 },
  errorBox: { marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: "#FEE4E2" },
  errorText: { color: "#B42318", fontSize: 13, lineHeight: 18 },
  formCard: { padding: 18, borderRadius: 22, borderWidth: 1, borderColor: "#EAECF0", backgroundColor: "#FFFFFF", shadowColor: "#101828", shadowOpacity: 0.07, shadowRadius: 16 },
  formTitle: { color: "#101828", fontSize: 22, fontWeight: "900" },
  formSubtitle: { color: "#667085", lineHeight: 20, marginTop: 5, marginBottom: 10 },
  label: { marginBottom: 7, fontSize: 13, fontWeight: "700", color: "#344054" },
  input: { height: 50, marginBottom: 14, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: "#D0D5DD", color: "#101828", backgroundColor: "#F9FAFB" },
  passwordRow: { flexDirection: "row", height: 50, marginBottom: 16, borderRadius: 14, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB", overflow: "hidden" },
  passwordInput: { flex: 1, paddingHorizontal: 12, color: "#101828" },
  showButton: { width: 70, alignItems: "center", justifyContent: "center" },
  showText: { color: "#0A4A35", fontWeight: "700" },
  accessBox: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: "#EAF4EF" },
  accessTitle: { marginBottom: 5, fontSize: 12, fontWeight: "900", color: "#0A4A35" },
  accessText: { fontSize: 12, lineHeight: 18, color: "#475467" },
  loginButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#0A4A35" },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  signupButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: "#D0D5DD", marginTop: 10 },
  signupButtonText: { color: "#0A4A35", fontSize: 15, fontWeight: "900" },
  securityHint: { marginTop: 20, color: "#667085", fontSize: 11, textAlign: "center" },
});
