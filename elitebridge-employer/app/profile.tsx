import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  clearEmployerSession,
  getAgencyProfile,
  getEmployerSession,
  saveAgencyProfile,
  type AgencyProfile,
  type EmployerSession,
} from "../lib/employer-storage";
import { clearEmployerBackendSession } from "../lib/shared-api";

type PayrollProvider = NonNullable<AgencyProfile["payrollProvider"]>;

const SUPPORT_EMAIL = "info@elitebridgestaffing.com";
const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const PAYROLL_OPTIONS: Array<{ name: Exclude<PayrollProvider, "">; detail: string }> = [
  { name: "Gusto", detail: "Payroll and contractor payment connection" },
  { name: "ADP", detail: "Workforce payroll sync for agency teams" },
  { name: "QuickBooks", detail: "Accounting-ready payroll export" },
];

const emptyProfile: AgencyProfile = {
  agencyName: "Sample Care Agency",
  agencyType: "Home Care Agency",
  city: "Lowell",
  state: "MA",
  employeeCount: "1–10",
  medicaidPrograms: false,
  evvRequired: false,
  logoUri: "",
  contactName: "Agency Administrator",
  phone: "(508) 251-9346",
  payrollProvider: "",
};

export default function EmployerProfile() {
  const router = useRouter();
  const [session, setSession] = useState<EmployerSession | null>(null);
  const [profile, setProfile] = useState<AgencyProfile>(emptyProfile);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    Promise.all([getEmployerSession(), getAgencyProfile()]).then(([savedSession, savedProfile]) => {
      setSession(savedSession);
      setProfile({ ...emptyProfile, ...(savedProfile ?? {}) });
    });
  }, []);

  const initials = useMemo(() => {
    const source = profile.agencyName || session?.name || "Elite Bridge";
    return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }, [profile.agencyName, session?.name]);

  const save = async () => {
    await saveAgencyProfile({
      ...profile,
      agencyName: profile.agencyName.trim() || emptyProfile.agencyName,
      city: profile.city.trim() || emptyProfile.city,
      state: profile.state.trim().toUpperCase() || emptyProfile.state,
      logoUri: profile.logoUri?.trim(),
      contactName: profile.contactName?.trim(),
      phone: profile.phone?.trim(),
    });
    Alert.alert("Profile saved", "Your employer profile, logo and payroll preferences were updated.");
  };

  const signOut = () => {
    Alert.alert("Sign out", "Sign out of Elite Bridge Employer on this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await Promise.all([clearEmployerSession(), clearEmployerBackendSession()]);
          router.replace("/login");
        },
      },
    ]);
  };

  const requestDeletion = () => {
    const subject = encodeURIComponent("Elite Bridge Employer account deletion request");
    const body = encodeURIComponent(
      `Please delete my Elite Bridge Employer account and associated agency user data, subject to legally required record retention.\n\nAgency: ${profile.agencyName}\nAccount email: ${session?.email || ""}\nName: ${session?.name || profile.contactName || ""}`,
    );
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const openSupport = () => {
    const subject = encodeURIComponent("Elite Bridge Employer support");
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

  const openSummary = (label: string) => {
    if (label === "Time off") {
      Alert.alert("Time off", "No pending time-off requests are waiting in this workspace. Future requests from staff will appear here for employer review.");
      return;
    }
    if (label === "Sick leave") {
      Alert.alert("Sick leave", "No sick-leave requests are pending. When caregivers submit sick leave, employers can review status and coverage impact here.");
      return;
    }
    if (label === "Submissions") {
      Alert.alert("Submissions", "No open form submissions are pending. Staff forms, visit notes and correction requests will appear here.");
      return;
    }
    router.push("/setup");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eye}>ELITE BRIDGE EMPLOYER</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Company identity, payroll connections, submissions and account settings.</Text>

        <View style={styles.profileCard}>
          {profile.logoUri ? (
            <Image source={{ uri: profile.logoUri }} style={styles.logoImage} resizeMode="cover" />
          ) : (
            <View style={styles.logoFallback}><Text style={styles.logoFallbackText}>{initials}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.agency}>{profile.agencyName}</Text>
            <Text style={styles.meta}>{profile.city || "Lowell"}, {profile.state || "MA"} · {profile.agencyType}</Text>
            <Text style={styles.badge}>Employer workspace active</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Company logo</Text>
          <Text style={styles.help}>Paste a secure logo image URL. When backend file storage is enabled, this field becomes the upload target.</Text>
          <TextInput
            value={profile.logoUri}
            onChangeText={(logoUri) => setProfile({ ...profile, logoUri })}
            placeholder="https://youragency.com/logo.png"
            placeholderTextColor="#98A2B3"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal information</Text>
          <Field label="Agency name" value={profile.agencyName} onChangeText={(agencyName) => setProfile({ ...profile, agencyName })} />
          <Field label="Contact name" value={profile.contactName ?? ""} onChangeText={(contactName) => setProfile({ ...profile, contactName })} />
          <Field label="Email" value={session?.email ?? ""} editable={false} />
          <Field label="Phone" value={profile.phone ?? ""} onChangeText={(phone) => setProfile({ ...profile, phone })} keyboardType="phone-pad" />
          <Field label="Primary city" value={profile.city} onChangeText={(city) => setProfile({ ...profile, city })} />
          <Field label="State" value={profile.state} onChangeText={(state) => setProfile({ ...profile, state })} autoCapitalize="characters" maxLength={2} />
          <TouchableOpacity style={styles.primary} onPress={save}><Text style={styles.primaryText}>Save profile</Text></TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {[
            { label: "Time off", value: "0", detail: "Open requests" },
            { label: "Sick leave", value: "0", detail: "Pending review" },
            { label: "Submissions", value: "0", detail: "Forms shared" },
            { label: "Settings", value: "MA", detail: "Agency region" },
          ].map((item) => (
            <TouchableOpacity key={item.label} accessibilityRole="button" style={styles.quickCard} onPress={() => openSummary(item.label)}>
              <Text style={styles.quickValue}>{item.value}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
              <Text style={styles.quickDetail}>{item.detail}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payroll integrations</Text>
          <Text style={styles.help}>Choose the payroll provider Elite Bridge should connect with when production OAuth keys are enabled.</Text>
          {PAYROLL_OPTIONS.map((option) => {
            const selected = profile.payrollProvider === option.name;
            return (
              <TouchableOpacity key={option.name} style={[styles.integration, selected && styles.integrationActive]} onPress={() => setProfile({ ...profile, payrollProvider: option.name })}>
                <View style={styles.integrationMark}><Text style={styles.integrationMarkText}>{option.name[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.integrationTitle}>{option.name}</Text>
                  <Text style={styles.integrationDetail}>{option.detail}</Text>
                </View>
                <Text style={[styles.integrationStatus, selected && styles.integrationStatusActive]}>{selected ? "Linked" : "Link"}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.listCard}>
          {[
            { label: "Privacy Policy", detail: "App privacy, data use and account rights", onPress: () => Linking.openURL(PRIVACY_URL) },
            { label: "Support center", detail: SUPPORT_EMAIL, onPress: openSupport },
            { label: "Compliance settings", detail: "Massachusetts-aware agency checks", onPress: () => router.push("/compliance") },
          ].map((item, index) => (
            <TouchableOpacity key={item.label} style={[styles.listItem, index > 0 && styles.listBorder]} onPress={item.onPress}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.label}</Text>
                <Text style={styles.listDetail}>{item.detail}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOut} onPress={signOut}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>

        <View style={styles.advanced}>
          <TouchableOpacity onPress={() => setAdvancedOpen((open) => !open)} style={styles.advancedHeader}>
            <Text style={styles.advancedTitle}>Advanced account controls</Text>
            <Text style={styles.chevron}>{advancedOpen ? "⌃" : "⌄"}</Text>
          </TouchableOpacity>
          {advancedOpen ? (
            <View style={styles.advancedBody}>
              <Text style={styles.help}>Account deletion is intentionally separated from sign out to prevent accidental requests. Elite Bridge may retain legally required staffing, payroll, safety and compliance records.</Text>
              <TouchableOpacity style={styles.deleteButton} onPress={requestDeletion}><Text style={styles.deleteText}>Request account deletion</Text></TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#98A2B3" style={[styles.input, props.editable === false && styles.disabledInput]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F9F8" },
  content: { padding: 18, paddingBottom: 122 },
  eye: { color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#101828", fontSize: 32, fontWeight: "900", marginTop: 4 },
  sub: { color: "#667085", fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 16 },
  profileCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 14, marginBottom: 14, padding: 16 },
  logoImage: { width: 76, height: 76, borderRadius: 22, backgroundColor: "#EAF4EF" },
  logoFallback: { alignItems: "center", backgroundColor: "#0A4A35", borderRadius: 22, height: 76, justifyContent: "center", width: 76 },
  logoFallbackText: { color: "#EBCB8B", fontSize: 22, fontWeight: "900" },
  agency: { color: "#101828", fontSize: 19, fontWeight: "900" },
  meta: { color: "#667085", fontSize: 12, lineHeight: 18, marginTop: 4 },
  badge: { alignSelf: "flex-start", backgroundColor: "#ECFDF3", borderRadius: 999, color: "#067647", fontSize: 10, fontWeight: "900", marginTop: 8, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 16 },
  cardTitle: { color: "#101828", fontSize: 18, fontWeight: "900" },
  help: { color: "#667085", fontSize: 12, lineHeight: 18, marginTop: 6 },
  label: { color: "#344054", fontSize: 12, fontWeight: "900", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderColor: "#D0D5DD", borderRadius: 13, borderWidth: 1, color: "#101828", padding: 13 },
  disabledInput: { color: "#667085" },
  primary: { alignItems: "center", backgroundColor: "#0A4A35", borderRadius: 13, marginTop: 16, padding: 14 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  quickCard: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderRadius: 16, borderWidth: 1, flexBasis: "48%", flexGrow: 1, padding: 14 },
  quickValue: { color: "#0A4A35", fontSize: 24, fontWeight: "900" },
  quickLabel: { color: "#101828", fontSize: 13, fontWeight: "900", marginTop: 3 },
  quickDetail: { color: "#667085", fontSize: 11, marginTop: 3 },
  integration: { alignItems: "center", borderColor: "#E4E7EC", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 10, padding: 12 },
  integrationActive: { backgroundColor: "#EAF4EF", borderColor: "#0A4A35" },
  integrationMark: { alignItems: "center", backgroundColor: "#0A4A35", borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  integrationMarkText: { color: "#EBCB8B", fontWeight: "900" },
  integrationTitle: { color: "#101828", fontSize: 15, fontWeight: "900" },
  integrationDetail: { color: "#667085", fontSize: 11, lineHeight: 16, marginTop: 2 },
  integrationStatus: { color: "#667085", fontSize: 12, fontWeight: "900" },
  integrationStatusActive: { color: "#0A4A35" },
  listCard: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderRadius: 18, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  listItem: { alignItems: "center", flexDirection: "row", gap: 12, padding: 15 },
  listBorder: { borderTopColor: "#F2F4F7", borderTopWidth: 1 },
  listTitle: { color: "#101828", fontSize: 15, fontWeight: "900" },
  listDetail: { color: "#667085", fontSize: 11, marginTop: 3 },
  chevron: { color: "#98A2B3", fontSize: 22, fontWeight: "900" },
  signOut: { alignItems: "center", backgroundColor: "#FFF5F4", borderColor: "#FDA29B", borderRadius: 14, borderWidth: 1, marginBottom: 14, padding: 14 },
  signOutText: { color: "#B42318", fontSize: 14, fontWeight: "900" },
  advanced: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  advancedHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: 14 },
  advancedTitle: { color: "#344054", fontSize: 13, fontWeight: "900" },
  advancedBody: { borderTopColor: "#F2F4F7", borderTopWidth: 1, padding: 14 },
  deleteButton: { alignItems: "center", backgroundColor: "#FFF5F4", borderColor: "#FDA29B", borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 12 },
  deleteText: { color: "#B42318", fontSize: 13, fontWeight: "900" },
});
