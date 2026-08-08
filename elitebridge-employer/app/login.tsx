import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getAgencyProfile, saveEmployerSession } from "../lib/employer-storage";
import { ensureEmployerBackendSession, sharedApiConfigured } from "../lib/shared-api";

export default function EmployerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) return Alert.alert("Missing information", "Enter your email and password.");
    if (!sharedApiConfigured) return Alert.alert("Service unavailable", "Elite Bridge Employer cannot reach the secure agency service in this build.");

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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.content}>
          <View style={styles.logoMark}><Text style={styles.logoText}>EB</Text></View>
          <Text style={styles.brand}>ELITE BRIDGE</Text>
          <Text style={styles.brandSub}>EMPLOYER</Text>
          <Text style={styles.title}>Run your care workforce with confidence.</Text>
          <Text style={styles.subtitle}>Scheduling, staffing, compliance signals and AI-assisted operations for care agencies.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Work email</Text>
            <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" value={email} onChangeText={setEmail} style={styles.input} placeholder="you@agency.com" placeholderTextColor="#98A2B3" />
            <Text style={styles.label}>Password</Text>
            <TextInput secureTextEntry textContentType="password" value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" placeholderTextColor="#98A2B3" onSubmitEditing={() => void signIn()} />

            <View style={styles.accessBox}>
              <Text style={styles.accessTitle}>Employer access</Text>
              <Text style={styles.accessText}>Sign in with an employer or agency administrator account. Caregivers use the separate Elite Bridge caregiver app.</Text>
            </View>

            <TouchableOpacity disabled={busy} onPress={signIn} style={[styles.primary, busy && { opacity: 0.65 }]}>
              <Text style={styles.primaryText}>{busy ? "Signing in…" : "Sign in to Employer"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footer}>Massachusetts operations · Employer access only</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F9F8" }, fill: { flex: 1 }, content: { flex: 1, padding: 22, justifyContent: "center" },
  logoMark: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#0A4A35", marginBottom: 14 },
  logoText: { color: "#EBCB8B", fontSize: 20, fontWeight: "900" }, brand: { color: "#0A4A35", fontSize: 15, fontWeight: "900", letterSpacing: 1.4 },
  brandSub: { color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 2.2, marginTop: 2 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: "900", color: "#101828", marginTop: 18 }, subtitle: { color: "#667085", lineHeight: 21, marginTop: 8, marginBottom: 20 },
  card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 20, padding: 18 },
  label: { color: "#344054", fontWeight: "800", marginBottom: 6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB", color: "#101828", borderRadius: 12, padding: 13, marginBottom: 10 },
  accessBox: { backgroundColor: "#F2F4F7", borderRadius: 12, padding: 12, marginVertical: 8 }, accessTitle: { color: "#344054", fontWeight: "900", marginBottom: 5 }, accessText: { color: "#667085", lineHeight: 19, fontSize: 12 },
  primary: { backgroundColor: "#0A4A35", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 10 }, primaryText: { color: "white", fontWeight: "900", fontSize: 15 },
  footer: { textAlign: "center", color: "#98A2B3", fontSize: 11, marginTop: 18 },
});
