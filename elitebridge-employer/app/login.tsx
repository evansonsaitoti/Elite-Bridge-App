import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getAgencyProfile, saveAgencyProfile, saveEmployerSession } from "../lib/employer-storage";
import { ensureEmployerBackendSession, sharedApiConfigured } from "../lib/shared-api";

const REVIEW_EMAIL = "appreview-employer@elitebridgestaffing.com";
const REVIEW_PASSWORD = "Employer2026!";

export default function EmployerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const continueReviewAccess = async () => {
    await saveEmployerSession({
      email: REVIEW_EMAIL,
      name: "Agency Review Administrator",
      role: "administrator",
    });
    await saveAgencyProfile({
      agencyName: "Sample Care Agency",
      agencyType: "Home Care Agency",
      city: "Lowell",
      state: "MA",
      employeeCount: "11–25",
      medicaidPrograms: false,
      evvRequired: true,
    });
    router.replace("/");
  };

  const signIn = async () => {
    if (!email.trim() || !password) {
      return Alert.alert("Missing information", "Enter your work email and password.");
    }
    if (email.trim().toLowerCase() === REVIEW_EMAIL && password === REVIEW_PASSWORD) {
      await continueReviewAccess();
      return;
    }
    if (!sharedApiConfigured) {
      return Alert.alert("Service unavailable", "Elite Bridge Employer cannot reach the secure agency service in this build.");
    }

    setBusy(true);
    try {
      const user = await ensureEmployerBackendSession(email, password);
      await saveEmployerSession({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        role: "administrator",
      });
      const agency = await getAgencyProfile();
      router.replace(agency ? "/" : "/setup");
    } catch (error) {
      Alert.alert("Unable to sign in", error instanceof Error ? error.message : "Please check your account details and try again.");
    } finally {
      setBusy(false);
    }
  };

  const startAgencySetup = async () => {
    await saveEmployerSession({
      email: "newagency@example.com",
      name: "New Agency Owner",
      role: "owner",
    });
    router.push("/setup");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoText}>EB</Text>
            </View>
            <View>
              <Text style={styles.brand}>ELITE BRIDGE</Text>
              <Text style={styles.brandSub}>EMPLOYER PORTAL</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>CARE OPERATIONS HQ</Text>
            <Text style={styles.title}>Sign in to manage your agency.</Text>
            <Text style={styles.subtitle}>
              Schedule caregivers, review coverage, track timesheets and keep care operations organized for any eligible care organization.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Use your administrator account to continue.</Text>

            <Text style={styles.label}>Work email</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@agency.com"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              textContentType="username"
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                editable={!busy}
                onChangeText={setPassword}
                onSubmitEditing={() => void signIn()}
                placeholder="Enter password"
                placeholderTextColor="#98A2B3"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                textContentType="password"
                value={password}
              />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.showButton}>
                <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity disabled={busy} onPress={signIn} style={[styles.primary, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Sign in to Employer</Text>}
            </TouchableOpacity>

            <TouchableOpacity disabled={busy} onPress={continueReviewAccess} style={styles.demoButton}>
              <Text style={styles.demoButtonText}>Continue with review access</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={busy} onPress={startAgencySetup} style={styles.secondary}>
              <Text style={styles.secondaryText}>New agency? Complete setup</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accessBox}>
            <Text style={styles.accessTitle}>Built for care employers</Text>
            <Text style={styles.accessText}>
              Any eligible care agency, staffing organization or facility operator can request access and use this employer workspace.
            </Text>
          </View>

          <Text style={styles.footer}>Secure agency sync · Public B2B care operations platform</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F7F5" },
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 22, paddingBottom: 34 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 24 },
  logoMark: { alignItems: "center", backgroundColor: "#0A4A35", borderRadius: 18, height: 58, justifyContent: "center", width: 58 },
  logoText: { color: "#EBCB8B", fontSize: 20, fontWeight: "900" },
  brand: { color: "#0A4A35", fontSize: 15, fontWeight: "900", letterSpacing: 1.4 },
  brandSub: { color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 2.2, marginTop: 2 },
  hero: { marginBottom: 18 },
  heroEyebrow: { color: "#C58A24", fontSize: 11, fontWeight: "900", letterSpacing: 1.6, marginBottom: 8 },
  title: { color: "#101828", fontSize: 32, fontWeight: "900", lineHeight: 38 },
  subtitle: { color: "#667085", fontSize: 15, lineHeight: 22, marginTop: 10 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderRadius: 24, borderWidth: 1, padding: 18, shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 18 },
  cardTitle: { color: "#101828", fontSize: 22, fontWeight: "900" },
  cardSub: { color: "#667085", lineHeight: 20, marginBottom: 14, marginTop: 5 },
  label: { color: "#344054", fontSize: 13, fontWeight: "800", marginBottom: 7, marginTop: 8 },
  input: { backgroundColor: "#F9FAFB", borderColor: "#D0D5DD", borderRadius: 14, borderWidth: 1, color: "#101828", minHeight: 50, paddingHorizontal: 14 },
  passwordRow: { alignItems: "center", backgroundColor: "#F9FAFB", borderColor: "#D0D5DD", borderRadius: 14, borderWidth: 1, flexDirection: "row", minHeight: 50, overflow: "hidden" },
  passwordInput: { color: "#101828", flex: 1, paddingHorizontal: 14 },
  showButton: { alignItems: "center", height: 50, justifyContent: "center", width: 70 },
  showText: { color: "#0A4A35", fontWeight: "800" },
  primary: { alignItems: "center", backgroundColor: "#0A4A35", borderRadius: 14, justifyContent: "center", marginTop: 18, minHeight: 52 },
  disabled: { opacity: 0.65 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  demoButton: { alignItems: "center", backgroundColor: "#EAF4EF", borderRadius: 14, justifyContent: "center", marginTop: 10, minHeight: 50 },
  demoButtonText: { color: "#0A4A35", fontSize: 15, fontWeight: "900" },
  secondary: { alignItems: "center", borderColor: "#D0D5DD", borderRadius: 14, borderWidth: 1, marginTop: 10, padding: 14 },
  secondaryText: { color: "#0A4A35", fontWeight: "900" },
  accessBox: { backgroundColor: "#EAF4EF", borderRadius: 18, marginTop: 16, padding: 14 },
  accessTitle: { color: "#0A4A35", fontWeight: "900", marginBottom: 5 },
  accessText: { color: "#475467", fontSize: 12, lineHeight: 18 },
  footer: { color: "#98A2B3", fontSize: 11, marginTop: 18, textAlign: "center" },
});
