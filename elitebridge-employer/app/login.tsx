import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { DEMO_EMPLOYER, saveEmployerSession } from "../lib/employer-storage";
import { ensureEmployerBackendSession, sharedApiConfigured } from "../lib/shared-api";

export default function EmployerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState<string>(DEMO_EMPLOYER.email);
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) return Alert.alert("Missing information", "Enter your email and password.");
    if (email.trim().toLowerCase() !== DEMO_EMPLOYER.email || password !== DEMO_EMPLOYER.password) {
      return Alert.alert("Unable to sign in", "Use the App Review employer credentials shown below.");
    }
    setBusy(true);
    try {
      if (sharedApiConfigured) {
        await ensureEmployerBackendSession(DEMO_EMPLOYER.email, DEMO_EMPLOYER.password);
      }
      await saveEmployerSession({ email: DEMO_EMPLOYER.email, name: DEMO_EMPLOYER.name, role: "administrator" });
      router.replace("/setup");
    } catch (error) {
      Alert.alert("Shared service unavailable", error instanceof Error ? error.message : "Could not connect to the Elite Bridge shared service.");
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
            <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} placeholder="you@agency.com" placeholderTextColor="#98A2B3" />
            <Text style={styles.label}>Password</Text>
            <TextInput secureTextEntry value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" placeholderTextColor="#98A2B3" />

            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>App Review access</Text>
              <Text style={styles.demoText}>Email: {DEMO_EMPLOYER.email}</Text>
              <Text style={styles.demoText}>Password: {DEMO_EMPLOYER.password}</Text>
              <Text style={styles.syncText}>{sharedApiConfigured ? "Secure agency sync enabled" : "Secure local preview enabled"}</Text>
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
  demoBox: { backgroundColor: "#F2F4F7", borderRadius: 12, padding: 12, marginVertical: 8 }, demoTitle: { color: "#344054", fontWeight: "900", marginBottom: 5 }, demoText: { color: "#667085", lineHeight: 19 },
  syncText: { color: "#0A4A35", fontSize: 11, fontWeight: "800", marginTop: 7 },
  primary: { backgroundColor: "#0A4A35", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 10 }, primaryText: { color: "white", fontWeight: "900", fontSize: 15 },
  footer: { textAlign: "center", color: "#98A2B3", fontSize: 11, marginTop: 18 },
});
