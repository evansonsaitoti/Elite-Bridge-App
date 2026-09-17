import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmployerProfile, getEmployerProfile, updateEmployerProfile } from "../lib/api";
import { colors } from "../lib/theme";

const emptyProfile: EmployerProfile = { id: 0, userId: 0, firstName: "", lastName: "", email: "", phone: "", companyName: "", companyDescription: "", website: "", servicesOffered: [], billingAddress: {}, verificationStatus: "pending" };

export default function ProfileScreen() {
  const [profile, setProfile] = useState(emptyProfile);
  const [services, setServices] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getEmployerProfile().then((value) => { setProfile(value); setServices(value.servicesOffered.join(", ")); }).catch((error) => Alert.alert("Unable to load profile", error instanceof Error ? error.message : "Please try again.")).finally(() => setLoading(false)); }, []);
  const set = (key: keyof EmployerProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const setAddress = (key: "address" | "city" | "state" | "zipCode", value: string) => setProfile((current) => ({ ...current, billingAddress: { ...current.billingAddress, [key]: value } }));
  const save = async () => {
    if (![profile.firstName, profile.lastName, profile.companyName, profile.phone].every((value) => value.trim())) return Alert.alert("Complete required fields", "Contact name, organization and phone are required.");
    setSaving(true);
    try { const updated = await updateEmployerProfile({ ...profile, servicesOffered: services.split(",").map((item) => item.trim()).filter(Boolean) }); setProfile(updated); Alert.alert("Profile saved", "Your employer profile is up to date."); }
    catch (error) { Alert.alert("Profile not saved", error instanceof Error ? error.message : "Please try again."); }
    finally { setSaving(false); }
  };
  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.green} size="large" /></SafeAreaView>;
  return <SafeAreaView edges={["bottom"]} style={styles.safe}><KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.status}><Text style={styles.statusTitle}>Organization profile</Text><Text style={styles.statusBody}>Caregivers see your organization name on matched shift offers. Your verification status is {profile.verificationStatus}.</Text></View>
    <Text style={styles.section}>Primary contact</Text>
    <View style={styles.double}><View style={styles.half}><Field label="First name" value={profile.firstName} onChangeText={(v) => set("firstName", v)} /></View><View style={styles.half}><Field label="Last name" value={profile.lastName} onChangeText={(v) => set("lastName", v)} /></View></View>
    <Field label="Work email" value={profile.email} editable={false} helper="Contact support to change the sign-in email." />
    <Field label="Phone" value={profile.phone} keyboardType="phone-pad" onChangeText={(v) => set("phone", v)} />
    <Text style={styles.section}>Organization</Text>
    <Field label="Organization name" value={profile.companyName} onChangeText={(v) => set("companyName", v)} />
    <Field label="Description" value={profile.companyDescription} multiline numberOfLines={4} onChangeText={(v) => set("companyDescription", v)} style={styles.multiline} />
    <Field label="Website" value={profile.website} autoCapitalize="none" keyboardType="url" onChangeText={(v) => set("website", v)} />
    <Field label="Services offered" value={services} onChangeText={setServices} helper="Separate services with commas." />
    <Text style={styles.section}>Service address</Text>
    <Field label="Street address" value={profile.billingAddress.address || ""} onChangeText={(v) => setAddress("address", v)} />
    <Field label="City" value={profile.billingAddress.city || ""} onChangeText={(v) => setAddress("city", v)} />
    <View style={styles.double}><View style={styles.half}><Field label="State" value={profile.billingAddress.state || ""} autoCapitalize="characters" maxLength={2} onChangeText={(v) => setAddress("state", v)} /></View><View style={styles.half}><Field label="ZIP code" value={profile.billingAddress.zipCode || ""} keyboardType="number-pad" onChangeText={(v) => setAddress("zipCode", v)} /></View></View>
    <TouchableOpacity disabled={saving} onPress={() => void save()} style={[styles.save, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save organization profile</Text>}</TouchableOpacity>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Field({ label, helper, style, ...props }: { label: string; helper?: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} autoCorrect={false} placeholderTextColor="#8A9790" style={[styles.input, style]} />{helper ? <Text style={styles.helper}>{helper}</Text> : null}</View>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, fill: { flex: 1 }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }, content: { padding: 20, paddingBottom: 42 }, status: { backgroundColor: colors.greenSoft, borderRadius: 16, padding: 15 }, statusTitle: { color: colors.greenDark, fontSize: 16, fontWeight: "900" }, statusBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }, section: { color: colors.ink, fontSize: 19, fontWeight: "900", marginTop: 24 }, field: { flex: 1 }, label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 7, marginTop: 12 }, input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 14, minHeight: 50, paddingHorizontal: 13 }, helper: { color: colors.muted, fontSize: 10, marginTop: 4 }, multiline: { minHeight: 105, paddingTop: 13, textAlignVertical: "top" }, double: { flexDirection: "row", gap: 10 }, half: { flex: 1 }, save: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, justifyContent: "center", marginTop: 24, minHeight: 54 }, saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.6 },
});
