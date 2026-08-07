import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ensureCaregiverBackendSession, sharedApiConfigured } from "@/lib/shared-api";

const STAFF_ACCOUNT = {
  email: "staff@elitebridge.com",
  password: "Staff123!",
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState(STAFF_ACCOUNT.email);
  const [password, setPassword] = useState(STAFF_ACCOUNT.password);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter both your email address and password.");
      return;
    }
    if (email.trim().toLowerCase() !== STAFF_ACCOUNT.email.toLowerCase() || password !== STAFF_ACCOUNT.password) {
      setError("These details do not match the review caregiver account. Use the credentials shown below.");
      return;
    }

    try {
      setIsLoading(true);
      if (sharedApiConfigured) {
        await ensureCaregiverBackendSession(STAFF_ACCOUNT.email, STAFF_ACCOUNT.password);
      }
      await AsyncStorage.setItem(
        "elitebridge-session",
        JSON.stringify({ role: "staff", email: STAFF_ACCOUNT.email, signedInAt: new Date().toISOString() }),
      );
      router.replace("/(staff)/home");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not connect to the Elite Bridge shared service.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          source={require("../../assets/images/elitebridge-logo.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Elite Bridge logo"
        />
        <Text style={styles.slogan}>ELITE BRIDGE</Text>
        <Text style={styles.caregiverLabel}>FOR CAREGIVERS</Text>
        <Text style={styles.tagline}>Find work, manage your shifts and keep your day moving.</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>YOUR WORKDAY, ONE PLACE</Text>
          <Text style={styles.heroTitle}>Ready for your next shift?</Text>
          <Text style={styles.heroBody}>Browse available work, respond to priority coverage, manage assignments and keep track of your day.</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
            placeholder="caregiver@example.com"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              placeholder="Enter password"
            />
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.showButton}>
              <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>App Review access</Text>
            <Text style={styles.demoText}>Email: {STAFF_ACCOUNT.email}</Text>
            <Text style={styles.demoText}>Password: {STAFF_ACCOUNT.password}</Text>
            <Text style={styles.syncText}>{sharedApiConfigured ? "Secure agency sync enabled" : "Secure local preview enabled"}</Text>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Sign in</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.employerHint}>Agency administrator? Use the separate Elite Bridge Employer app.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF" },
  logo: { width: 112, height: 112, alignSelf: "center", marginTop: 10 },
  slogan: { textAlign: "center", color: "#0A4A35", fontSize: 20, fontWeight: "900", letterSpacing: 1.2 },
  caregiverLabel: { marginTop: 4, textAlign: "center", color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 2.2 },
  tagline: { marginTop: 10, marginBottom: 22, textAlign: "center", color: "#667085", fontSize: 14, lineHeight: 20 },
  heroCard: { marginBottom: 16, padding: 18, borderRadius: 18, backgroundColor: "#0A4A35" },
  heroEyebrow: { color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: { marginTop: 7, color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  heroBody: { marginTop: 8, color: "#D9E9E2", fontSize: 13, lineHeight: 19 },
  errorBox: { marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: "#FEE4E2" },
  errorText: { color: "#B42318", fontSize: 13, lineHeight: 18 },
  formCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#EAECF0", backgroundColor: "#FFFFFF" },
  label: { marginBottom: 7, fontSize: 13, fontWeight: "700", color: "#344054" },
  input: { height: 48, marginBottom: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", color: "#101828", backgroundColor: "#F9FAFB" },
  passwordRow: { flexDirection: "row", height: 48, marginBottom: 14, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB", overflow: "hidden" },
  passwordInput: { flex: 1, paddingHorizontal: 12, color: "#101828" },
  showButton: { width: 66, alignItems: "center", justifyContent: "center" },
  showText: { color: "#0A4A35", fontWeight: "700" },
  demoBox: { marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: "#F2F4F7" },
  demoTitle: { marginBottom: 5, fontSize: 12, fontWeight: "800", color: "#344054" },
  demoText: { fontSize: 12, lineHeight: 18, color: "#475467" },
  syncText: { color: "#0A4A35", fontSize: 11, fontWeight: "800", marginTop: 7 },
  loginButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#0A4A35" },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  employerHint: { marginTop: 20, color: "#667085", fontSize: 12, lineHeight: 18, textAlign: "center" },
});
