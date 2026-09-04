import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { signInEmployer } from "../lib/api";
import { enableEmployerPushNotifications } from "../lib/push-notifications";
import { cardShadow, colors } from "../lib/theme";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert("Missing information", "Enter your employer email and password.");
    setBusy(true);
    try {
      await signInEmployer(email, password);
      await enableEmployerPushNotifications().catch(() => false);
      router.replace("/dashboard");
    } catch (error) {
      Alert.alert("Unable to sign in", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>EMPLOYER ACCESS</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in with an employer account to manage shifts and caregiver applications.</Text>
          <Text style={styles.label}>Work email</Text>
          <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" onChangeText={setEmail} placeholder="name@organization.com" placeholderTextColor="#8A9790" style={styles.input} textContentType="username" value={email} />
          <Text style={styles.label}>Password</Text>
          <TextInput onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Enter password" placeholderTextColor="#8A9790" secureTextEntry style={styles.input} textContentType="password" value={password} />
          <TouchableOpacity disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Sign in</Text>}
          </TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={() => router.push("/register")} style={styles.secondary}><Text style={styles.secondaryText}>Create an employer account</Text></TouchableOpacity>
          <Text style={styles.note}>Caregiver accounts are not accepted here. Use Elite Bridge Caregiver to find and manage care work.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 },
  content: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, margin: 20, padding: 20 },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "900", marginTop: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20, marginTop: 8 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "800", marginBottom: 7, marginTop: 10 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 52, paddingHorizontal: 14 },
  primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 13, justifyContent: "center", marginTop: 22, minHeight: 52 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" }, disabled: { opacity: 0.6 },
  secondary: { alignItems: "center", borderRadius: 13, justifyContent: "center", marginTop: 10, minHeight: 48 },
  secondaryText: { color: colors.green, fontSize: 14, fontWeight: "900" },
  note: { backgroundColor: colors.greenSoft, borderRadius: 12, color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12, overflow: "hidden", padding: 12, textAlign: "center" },
});
