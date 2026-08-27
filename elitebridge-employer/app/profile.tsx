import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  clearEmployerSession,
  clearAllEmployerData,
  getAgencyProfile,
  getEmployerSession,
  isDemoEmployerSession,
  saveAgencyProfile,
  type AgencyProfile,
  type EmployerSession,
} from "../lib/employer-storage";
import { clearEmployerBackendSession, deleteEmployerBackendAccount } from "../lib/shared-api";

const SUPPORT_EMAIL = "info@elitebridgestaffing.com";
const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";

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
};

export default function EmployerProfile() {
  const router = useRouter();
  const [session, setSession] = useState<EmployerSession | null>(null);
  const [profile, setProfile] = useState<AgencyProfile>(emptyProfile);
  const [deleting, setDeleting] = useState(false);

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
    Alert.alert("Profile saved", "Your employer profile was updated.");
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

  const deleteAccount = () => {
    Alert.alert(
      "Permanently delete account?",
      "This permanently deletes your Elite Bridge Employer login and agency profile. This cannot be undone. Records that must be retained for legal, payroll, safety, or compliance obligations may be preserved as required by law.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (!isDemoEmployerSession(session)) await deleteEmployerBackendAccount();
              await clearAllEmployerData();
              Alert.alert("Account deleted", "Your Elite Bridge Employer account and local agency data have been deleted.", [
                { text: "Done", onPress: () => router.replace("/login") },
              ]);
            } catch (error) {
              Alert.alert("Unable to delete account", error instanceof Error ? error.message : "Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const openSupport = () => {
    const subject = encodeURIComponent("Elite Bridge Employer support");
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eye}>ELITE BRIDGE EMPLOYER</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Company identity, support, privacy and account settings.</Text>

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
          <Text style={styles.help}>Paste a secure, publicly accessible image URL for your agency logo.</Text>
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

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.help}>Permanently delete your employer login and agency profile directly in the app. This action cannot be undone.</Text>
          <TouchableOpacity disabled={deleting} style={[styles.deleteButton, deleting && styles.deleteDisabled]} onPress={deleteAccount}>
            <Text style={styles.deleteText}>{deleting ? "Deleting account…" : "Delete account permanently"}</Text>
          </TouchableOpacity>
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
  dangerZone: { backgroundColor: "#FFFFFF", borderColor: "#FDA29B", borderRadius: 16, borderWidth: 1, padding: 14 },
  dangerTitle: { color: "#B42318", fontSize: 16, fontWeight: "900" },
  deleteButton: { alignItems: "center", backgroundColor: "#FFF5F4", borderColor: "#FDA29B", borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 12 },
  deleteText: { color: "#B42318", fontSize: 13, fontWeight: "900" },
  deleteDisabled: { opacity: 0.55 },
});
