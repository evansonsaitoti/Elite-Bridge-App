import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { useOnboarding } from "@/lib/onboarding-context";
import { registerCaregiverAccount, sharedApiConfigured, updateCaregiverProfile } from "@/lib/shared-api";
import { enableCaregiverPushNotifications } from "@/lib/push-notifications";

export default function OnboardingReview() {
  const router = useRouter();
  const { data, completeOnboarding, prevStep } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (!sharedApiConfigured) return Alert.alert("Service unavailable", "Elite Bridge cannot reach the secure agency service in this build.");
    setSubmitting(true);
    try {
      const names = data.fullName.trim().split(/\s+/);
      const firstName = names.shift() || "Caregiver";
      const lastName = names.join(" ") || "Applicant";
      const user = await registerCaregiverAccount({ firstName, lastName, phone: data.phoneNumber, email: data.email, password: data.password });
      const experienceMatch = data.yearsOfExperience.match(/\d+/);
      await updateCaregiverProfile({ phone: data.phoneNumber, yearsExperience: experienceMatch ? Number(experienceMatch[0]) : 0, certifications: data.certifications });
      await AsyncStorage.setItem("elitebridge-session", JSON.stringify({ role: "staff", id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), signedInAt: new Date().toISOString() }));
      await enableCaregiverPushNotifications().catch(() => false);
      completeOnboarding();
      Alert.alert("Check your email", "Your caregiver profile is ready. We sent an activation link to confirm your email address.", [{ text: "Open my workspace", onPress: () => router.replace("/(staff)/home") }]);
    } catch (error) { Alert.alert("Could not create account", error instanceof Error ? error.message : "Your information remains on this screen. Please try again."); }
    finally { setSubmitting(false); }
  };

  const rows = [
    ["Name", data.fullName], ["Email", data.email], ["Phone", data.phoneNumber], ["Experience", data.yearsOfExperience],
    ["Credentials", data.certifications.join(", ") || "None selected"], ["Languages", data.languages.join(", ") || "Not specified"],
  ];
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.progress}><View style={styles.progressTop}><Text style={styles.progressTitle}>Step 3 of 3 · Review</Text><Text style={styles.progressCount}>100%</Text></View><View style={styles.track}><View style={styles.fill} /></View></View>
    <Text style={styles.title}>Review your caregiver profile</Text><Text style={styles.body}>This creates a real Caregiver account connected to the same marketplace used by Elite Bridge Employer.</Text>
    <View style={styles.card}>{rows.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>)}</View>
    <View style={styles.notice}><Text style={styles.noticeTitle}>Email confirmation</Text><Text style={styles.noticeBody}>After submission, an activation link will be sent to {data.email}. The link expires after 24 hours.</Text></View>
    <TouchableOpacity disabled={submitting} onPress={() => void submit()} style={[styles.primary, submitting && { opacity: 0.6 }]}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Create caregiver account</Text>}</TouchableOpacity>
    <TouchableOpacity disabled={submitting} onPress={() => { prevStep(); router.back(); }} style={styles.secondary}><Text style={styles.secondaryText}>Back to experience</Text></TouchableOpacity>
    <Text style={styles.legal}>By creating an account, you agree to Elite Bridge’s Terms of Use and acknowledge its Privacy Policy.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#F7FAF8" }, content: { padding: 20, paddingBottom: 40 }, progress: { backgroundColor: "#FFFFFF", borderColor: "#EAECF0", borderWidth: 1, borderRadius: 17, padding: 13 }, progressTop: { flexDirection: "row", justifyContent: "space-between" }, progressTitle: { color: "#344054", fontSize: 12, fontWeight: "900" }, progressCount: { color: "#667085", fontSize: 12, fontWeight: "800" }, track: { height: 6, borderRadius: 3, backgroundColor: "#EAECF0", marginTop: 9, overflow: "hidden" }, fill: { height: 6, width: "100%", backgroundColor: "#1B5E3F" }, title: { color: "#101828", fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 22 }, body: { color: "#667085", fontSize: 13, lineHeight: 20, marginTop: 7 }, card: { backgroundColor: "#FFFFFF", borderColor: "#EAECF0", borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 17 }, row: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D0D5DD", paddingVertical: 11 }, rowLabel: { color: "#667085", fontSize: 10, fontWeight: "900" }, rowValue: { color: "#101828", fontSize: 13, fontWeight: "800", marginTop: 4 }, notice: { backgroundColor: "#EAF4EF", borderRadius: 15, padding: 14, marginTop: 13 }, noticeTitle: { color: "#0A4A35", fontSize: 13, fontWeight: "900" }, noticeBody: { color: "#475467", fontSize: 12, lineHeight: 18, marginTop: 5 }, primary: { minHeight: 52, borderRadius: 14, backgroundColor: "#0A4A35", alignItems: "center", justifyContent: "center", marginTop: 17 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, secondary: { minHeight: 48, alignItems: "center", justifyContent: "center" }, secondaryText: { color: "#0A4A35", fontSize: 13, fontWeight: "900" }, legal: { color: "#667085", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 12 } });
