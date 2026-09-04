import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { registerEmployer } from "../lib/api";
import { enableEmployerPushNotifications } from "../lib/push-notifications";
import { colors } from "../lib/theme";

type Field = "firstName" | "lastName" | "companyName" | "phone" | "email" | "password";

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState<Record<Field, string>>({ firstName: "", lastName: "", companyName: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (field: Field, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    if (Object.values(form).some((value) => !value.trim())) return Alert.alert("Complete your account", "All fields are required.");
    if (form.password.length < 8) return Alert.alert("Choose a stronger password", "Your password must contain at least 8 characters.");
    setBusy(true);
    try {
      await registerEmployer(form);
      await enableEmployerPushNotifications().catch(() => false);
      router.replace("/dashboard");
    } catch (error) {
      Alert.alert("Account could not be created", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Join as an employer</Text>
          <Text style={styles.subtitle}>This registration creates an employer account only. Caregiver registration remains in the Elite Bridge Caregiver app.</Text>
          <FieldInput label="First name" value={form.firstName} onChangeText={(v) => set("firstName", v)} content="givenName" />
          <FieldInput label="Last name" value={form.lastName} onChangeText={(v) => set("lastName", v)} content="familyName" />
          <FieldInput label="Organization name" value={form.companyName} onChangeText={(v) => set("companyName", v)} content="organizationName" />
          <FieldInput label="Phone" value={form.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" content="telephoneNumber" />
          <FieldInput label="Work email" value={form.email} onChangeText={(v) => set("email", v)} keyboardType="email-address" content="emailAddress" autoCapitalize="none" />
          <FieldInput label="Password" value={form.password} onChangeText={(v) => set("password", v)} secureTextEntry content="newPassword" helper="At least 8 characters" />
          <TouchableOpacity disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Create employer account</Text>}</TouchableOpacity>
          <Text style={styles.consent}>By creating an account, you agree to Elite Bridge’s Terms of Use and acknowledge its Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldInput({ label, helper, content, ...props }: { label: string; helper?: string; content: React.ComponentProps<typeof TextInput>["textContentType"] } & React.ComponentProps<typeof TextInput>) {
  return <><Text style={styles.label}>{label}</Text><TextInput {...props} autoCorrect={false} placeholderTextColor="#8A9790" style={styles.input} textContentType={content} />{helper ? <Text style={styles.helper}>{helper}</Text> : null}</>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, fill: { flex: 1 }, content: { padding: 22, paddingBottom: 42 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 18, marginTop: 8 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "800", marginBottom: 7, marginTop: 12 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 52, paddingHorizontal: 14 },
  helper: { color: colors.muted, fontSize: 11, marginTop: 5 }, primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 13, justifyContent: "center", marginTop: 24, minHeight: 54 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.6 }, consent: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 12, textAlign: "center" },
});
