import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { useOnboarding } from "@/lib/onboarding-context";

export default function OnboardingWelcome() {
  const router = useRouter();
  const { data, updateData, nextStep } = useOnboarding();
  const [fullName, setFullName] = useState(data.fullName);
  const [email, setEmail] = useState(data.email);
  const [phone, setPhone] = useState(data.phoneNumber);
  const [password, setPassword] = useState(data.password);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const continueSignup = () => {
    if (fullName.trim().split(/\s+/).length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()) || !phone.trim() || password.length < 8) return Alert.alert("Complete required fields", "Enter your full name, valid email, phone number and a password of at least 8 characters.");
    if (password !== confirmPassword) return Alert.alert("Passwords do not match", "Enter the same password in both fields.");
    updateData({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phoneNumber: phone.trim(), password });
    nextStep();
    router.push("/(onboarding)/experience");
  };

  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.hero}><Text style={styles.eyebrow}>CAREGIVER PROFILE</Text><Text style={styles.heroTitle}>Join the Elite Bridge care network.</Text><Text style={styles.heroBody}>Create one verified profile to receive matched opportunities from employers using the companion Employer app.</Text></View>
    <Progress step="1" title="Account" width="33%" />
    <View style={styles.card}><Text style={styles.title}>Create your account</Text><Text style={styles.body}>Fields marked * are required. Your password is encrypted and never shown to employers.</Text>
      <Field label="Full legal name *" value={fullName} onChangeText={setFullName} placeholder="First and last name" />
      <Field label="Email address *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" textContentType="username" />
      <Field label="Phone number *" value={phone} onChangeText={setPhone} placeholder="(555) 555-0123" keyboardType="phone-pad" textContentType="telephoneNumber" />
      <PasswordField label="Password *" value={password} onChangeText={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
      <PasswordField label="Confirm password *" value={confirmPassword} onChangeText={setConfirmPassword} visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} />
      <Text style={styles.hint}>Use at least 8 characters.</Text>
      <TouchableOpacity onPress={continueSignup} style={styles.primary}><Text style={styles.primaryText}>Continue to experience</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Back</Text></TouchableOpacity>
    </View>
  </ScrollView></KeyboardAvoidingView>;
}

function Progress({ step, title, width }: { step: string; title: string; width: `${number}%` }) { return <View style={styles.progress}><View style={styles.progressTop}><Text style={styles.progressTitle}>Step {step} of 3 · {title}</Text><Text style={styles.progressCount}>{width.replace("%", "")}%</Text></View><View style={styles.track}><View style={[styles.fillTrack, { width }]} /></View></View>; }
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...inputProps } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} autoCorrect={false} placeholderTextColor="#98A2B3" style={styles.input} /></View>; }
function PasswordField({ label, value, onChangeText, visible, onToggle }: { label: string; value: string; onChangeText: (value: string) => void; visible: boolean; onToggle: () => void }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.passwordRow}><TextInput value={value} onChangeText={onChangeText} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder="At least 8 characters" placeholderTextColor="#98A2B3" style={styles.passwordInput} /><TouchableOpacity accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`} onPress={onToggle} style={styles.show}><Text style={styles.showText}>{visible ? "Hide" : "Show"}</Text></TouchableOpacity></View></View>; }

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: "#F7FAF8" }, content: { padding: 20, paddingBottom: 40 }, hero: { backgroundColor: "#0A4A35", borderRadius: 24, padding: 20 }, eyebrow: { color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }, heroTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 8 }, heroBody: { color: "#D9E9E2", fontSize: 13, lineHeight: 20, marginTop: 8 }, progress: { backgroundColor: "#FFFFFF", borderColor: "#EAECF0", borderWidth: 1, borderRadius: 17, padding: 13, marginVertical: 14 }, progressTop: { flexDirection: "row", justifyContent: "space-between" }, progressTitle: { color: "#344054", fontSize: 12, fontWeight: "900" }, progressCount: { color: "#667085", fontSize: 12, fontWeight: "800" }, track: { height: 6, borderRadius: 3, backgroundColor: "#EAECF0", marginTop: 9, overflow: "hidden" }, fillTrack: { height: 6, backgroundColor: "#1B5E3F" }, card: { backgroundColor: "#FFFFFF", borderColor: "#EAECF0", borderWidth: 1, borderRadius: 22, padding: 18 }, title: { color: "#101828", fontSize: 22, fontWeight: "900" }, body: { color: "#667085", fontSize: 12, lineHeight: 19, marginTop: 5, marginBottom: 8 }, field: { marginTop: 12 }, label: { color: "#344054", fontSize: 12, fontWeight: "900", marginBottom: 7 }, input: { minHeight: 51, borderRadius: 13, borderColor: "#D0D5DD", borderWidth: 1, backgroundColor: "#F9FAFB", color: "#101828", paddingHorizontal: 13 }, passwordRow: { minHeight: 51, flexDirection: "row", borderRadius: 13, borderColor: "#D0D5DD", borderWidth: 1, backgroundColor: "#F9FAFB", overflow: "hidden" }, passwordInput: { flex: 1, color: "#101828", paddingHorizontal: 13 }, show: { width: 66, alignItems: "center", justifyContent: "center" }, showText: { color: "#0A4A35", fontSize: 12, fontWeight: "900" }, hint: { color: "#667085", fontSize: 11, marginTop: 7 }, primary: { minHeight: 52, borderRadius: 14, backgroundColor: "#0A4A35", alignItems: "center", justifyContent: "center", marginTop: 18 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 7 }, secondaryText: { color: "#0A4A35", fontSize: 14, fontWeight: "900" } });
