import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { CaregiverProfile, clearCaregiverBackendSession, deleteCaregiverBackendAccount, getCaregiverProfile, updateCaregiverProfile } from "@/lib/shared-api";
import { disableCaregiverPushNotifications, enableCaregiverPushNotifications } from "@/lib/push-notifications";

const SUPPORT_EMAIL = "info@elitebridgestaffing.com";
const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const TERMS_URL = "https://elitebridgestaffing.com/terms/";

export default function StaffProfile() {
  const colors = useColors();
  const router = useRouter();
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [rate, setRate] = useState("0");
  const [experience, setExperience] = useState("0");
  const [specialties, setSpecialties] = useState("");
  const [certifications, setCertifications] = useState("");
  const [editing, setEditing] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCaregiverProfile().then((value) => {
      setProfile(value); setPhone(value.phone || ""); setBio(value.bio || ""); setRate(String(value.hourlyRate || 0)); setExperience(String(value.yearsExperience || 0)); setSpecialties((value.specialties || []).join(", ")); setCertifications((value.certifications || []).join(", "));
    }).catch((error) => Alert.alert("Unable to load profile", error instanceof Error ? error.message : "Please try again."));
  }, []);

  const save = async () => {
    const hourlyRate = Number(rate);
    const yearsExperience = Number(experience);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0 || !Number.isInteger(yearsExperience) || yearsExperience < 0) return Alert.alert("Check profile", "Enter valid experience and hourly-rate values.");
    setBusy(true);
    try {
      const updated = await updateCaregiverProfile({ phone: phone.trim(), bio: bio.trim(), hourlyRate, yearsExperience, specialties: specialties.split(",").map((item) => item.trim()).filter(Boolean), certifications: certifications.split(",").map((item) => item.trim()).filter(Boolean) });
      setProfile(updated); setEditing(false); Alert.alert("Profile updated", "Your employer-facing caregiver profile is synchronized.");
    } catch (error) { Alert.alert("Profile not saved", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const signOut = () => Alert.alert("Sign out?", "You can sign in again with your caregiver credentials.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", onPress: async () => { await disableCaregiverPushNotifications().catch(() => undefined); await clearCaregiverBackendSession(); await AsyncStorage.removeItem("elitebridge-session"); router.dismissAll(); router.replace("/(root)"); } }]);

  const deleteAccount = () => Alert.alert("Permanently delete account?", "This removes your Elite Bridge login and caregiver profile. Records that must be retained for legal, payroll, safety or compliance obligations may be preserved as required by law.", [{ text: "Cancel", style: "cancel" }, { text: "Delete account", style: "destructive", onPress: async () => { setBusy(true); try { await disableCaregiverPushNotifications().catch(() => undefined); await deleteCaregiverBackendAccount(); await AsyncStorage.removeItem("elitebridge-session"); router.dismissAll(); router.replace("/(root)"); } catch (error) { Alert.alert("Account not deleted", error instanceof Error ? error.message : "Contact support for help."); } finally { setBusy(false); } } }]);

  const togglePush = async (enabled: boolean) => {
    try { if (enabled) { const allowed = await enableCaregiverPushNotifications(); if (!allowed) return Alert.alert("Notifications are off", "Allow notifications in iOS Settings to receive shift updates."); } else await disableCaregiverPushNotifications(); setPushEnabled(enabled); }
    catch { Alert.alert("Notification setting unavailable", "Please try again while online."); }
  };

  if (!profile) return <ScreenContainer><View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.muted, { color: colors.muted }]}>Loading your profile…</Text></View></ScreenContainer>;

  const field = (label: string, value: string, onChangeText: (value: string) => void, props: Record<string, unknown> = {}) => <View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} {...props} /></View>;

  return <ScreenContainer><ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>ELITE BRIDGE CAREGIVER</Text><Text style={[styles.title, { color: colors.foreground }]}>Account</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Manage the profile employers see, notifications, privacy and access.</Text>
    <View style={[styles.identity, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><IconSymbol name="person.crop.circle.fill" size={31} color="#FFFFFF" /></View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.foreground }]}>{profile.firstName} {profile.lastName}</Text><Text style={[styles.muted, { color: colors.muted }]}>{profile.email}</Text><Text style={styles.synced}>Production profile synchronized</Text></View></View>

    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.cardHeading}><View><Text style={[styles.cardTitle, { color: colors.foreground }]}>Professional profile</Text><Text style={[styles.cardBody, { color: colors.muted }]}>Used for matching and employer decisions.</Text></View><TouchableOpacity onPress={() => setEditing((value) => !value)}><Text style={[styles.edit, { color: colors.primary }]}>{editing ? "Cancel" : "Edit"}</Text></TouchableOpacity></View>
      {editing ? <>{field("Phone", phone, setPhone, { keyboardType: "phone-pad" })}{field("Bio", bio, setBio, { multiline: true })}{field("Years of experience", experience, setExperience, { keyboardType: "number-pad" })}{field("Preferred hourly rate", rate, setRate, { keyboardType: "decimal-pad" })}{field("Services (comma-separated)", specialties, setSpecialties)}{field("Credentials (comma-separated)", certifications, setCertifications)}<TouchableOpacity disabled={busy} onPress={() => void save()} style={[styles.primary, { backgroundColor: colors.primary }]}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Save synchronized profile</Text>}</TouchableOpacity></> : <View style={styles.details}><Detail label="Phone" value={profile.phone || "Not added"} /><Detail label="Experience" value={`${profile.yearsExperience || 0} years`} /><Detail label="Services" value={(profile.specialties || []).join(", ") || "Add preferred services"} /><Detail label="Credentials" value={(profile.certifications || []).join(", ") || "Add credentials"} /><Detail label="Email status" value={profile.emailVerified ? "Verified" : "Verification pending"} /></View>}
    </View>

    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Notifications</Text><View style={styles.setting}><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Push notifications</Text><Text style={[styles.cardBody, { color: colors.muted }]}>Matched shifts, assignment and timesheet updates</Text></View><Switch value={pushEnabled} onValueChange={(value) => void togglePush(value)} /></View></View>

    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Help & legal</Text><LinkRow title="Contact support" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Elite%20Bridge%20caregiver%20support`)} /><LinkRow title="Privacy Policy" onPress={() => void Linking.openURL(PRIVACY_URL)} /><LinkRow title="Terms of Use" onPress={() => void Linking.openURL(TERMS_URL)} /></View>

    <TouchableOpacity onPress={signOut} style={[styles.signOut, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.signOutText, { color: colors.foreground }]}>Sign out</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => setAdvanced((value) => !value)} style={styles.advanced}><Text style={[styles.advancedText, { color: colors.muted }]}>Advanced account options</Text><Text style={{ color: colors.muted }}>{advanced ? "⌃" : "⌄"}</Text></TouchableOpacity>
    {advanced ? <View style={styles.danger}><Text style={styles.dangerTitle}>Account deletion</Text><Text style={styles.dangerBody}>Permanent deletion is available here to reduce accidental taps.</Text><TouchableOpacity disabled={busy} onPress={deleteAccount} style={styles.deleteButton}><Text style={styles.deleteText}>{busy ? "Deleting…" : "Continue to account deletion"}</Text></TouchableOpacity></View> : null}
    <Text style={[styles.companion, { color: colors.muted }]}>Elite Bridge Caregiver is connected to the separately listed Elite Bridge Employer app through the same care marketplace.</Text>
  </ScrollView></ScreenContainer>;
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
function LinkRow({ title, onPress }: { title: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.linkRow}><Text style={styles.linkText}>{title}</Text><Text style={styles.chevron}>›</Text></TouchableOpacity>; }

const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 128 }, loader: { flex: 1, alignItems: "center", justifyContent: "center" }, eyebrow: { color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, title: { fontSize: 30, fontWeight: "900", marginTop: 5 }, subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 17 }, identity: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 13 }, avatar: { width: 55, height: 55, borderRadius: 18, alignItems: "center", justifyContent: "center" }, name: { fontSize: 18, fontWeight: "900" }, muted: { fontSize: 12, marginTop: 4 }, synced: { color: "#067647", fontSize: 10, fontWeight: "900", marginTop: 7 }, card: { borderRadius: 18, borderWidth: 1, padding: 15, marginBottom: 13 }, cardHeading: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, cardTitle: { fontSize: 17, fontWeight: "900" }, cardBody: { fontSize: 11, lineHeight: 17, marginTop: 4 }, edit: { fontSize: 13, fontWeight: "900" }, field: { marginTop: 12 }, label: { fontSize: 12, fontWeight: "800", marginBottom: 6 }, input: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 }, primary: { minHeight: 49, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 14 }, primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" }, details: { marginTop: 10 }, detail: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D0D5DD", paddingVertical: 10 }, detailLabel: { color: "#667085", fontSize: 10, fontWeight: "800" }, detailValue: { color: "#101828", fontSize: 13, fontWeight: "800", marginTop: 3 }, setting: { flexDirection: "row", alignItems: "center", marginTop: 8 }, settingTitle: { fontSize: 14, fontWeight: "900" }, linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D0D5DD", minHeight: 51, marginTop: 5 }, linkText: { color: "#101828", fontSize: 14, fontWeight: "800" }, chevron: { color: "#667085", fontSize: 24 }, signOut: { minHeight: 52, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, signOutText: { fontSize: 14, fontWeight: "900" }, advanced: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 15, marginTop: 10 }, advancedText: { fontSize: 12, fontWeight: "800" }, danger: { backgroundColor: "#FFF5F4", borderColor: "#FDA29B", borderWidth: 1, borderRadius: 15, padding: 14 }, dangerTitle: { color: "#B42318", fontSize: 15, fontWeight: "900" }, dangerBody: { color: "#7A271A", fontSize: 11, lineHeight: 17, marginTop: 5 }, deleteButton: { borderColor: "#B42318", borderWidth: 1, borderRadius: 11, padding: 11, alignItems: "center", marginTop: 11 }, deleteText: { color: "#B42318", fontSize: 12, fontWeight: "900" }, companion: { textAlign: "center", fontSize: 11, lineHeight: 17, marginTop: 18 },
});
