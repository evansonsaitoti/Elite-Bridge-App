import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { deleteEmployerAccount, EmployerUser, getStoredEmployer, signOutEmployer } from "../lib/api";
import { colors } from "../lib/theme";

const SUPPORT_EMAIL = "info@elitebridgestaffing.com";
const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const TERMS_URL = "https://elitebridgestaffing.com/terms/";

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser] = useState<EmployerUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  useFocusEffect(useCallback(() => { getStoredEmployer().then((stored) => stored ? setUser(stored) : router.replace("/sign-in")); }, [router]));

  const signOut = () => Alert.alert("Sign out?", "You can sign in again using your employer credentials.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", onPress: async () => { await signOutEmployer(); router.dismissAll(); router.replace("/"); } }]);
  const remove = () => Alert.alert("Permanently delete account?", "This deletes your employer login and organization profile. Records that must be retained for legal, payroll or safety obligations may be preserved as required by law.", [{ text: "Cancel", style: "cancel" }, { text: "Delete account", style: "destructive", onPress: async () => {
    setDeleting(true);
    try { await deleteEmployerAccount(); router.dismissAll(); router.replace("/"); }
    catch (error) { Alert.alert("Account not deleted", error instanceof Error ? error.message : "Contact support for assistance."); }
    finally { setDeleting(false); }
  } }]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
      <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.firstName?.slice(0, 1).toUpperCase() || "E"}</Text></View><Text style={styles.name}>{user ? `${user.firstName} ${user.lastName}` : "Employer"}</Text><Text style={styles.email}>{user?.email}</Text><Text style={styles.badge}>EMPLOYER ACCOUNT</Text></View>
      <Text style={styles.section}>Account</Text>
      <Row title="Sign out" detail="Remove employer access from this device" onPress={signOut} />
      <Text style={styles.section}>Help and legal</Text>
      <Row title="Contact support" detail={SUPPORT_EMAIL} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Elite%20Bridge%20Employer%20support`)} />
      <Row title="Privacy Policy" detail="How Elite Bridge handles information" onPress={() => void Linking.openURL(PRIVACY_URL)} />
      <Row title="Terms of Use" detail="Employer marketplace terms" onPress={() => void Linking.openURL(TERMS_URL)} />
      <Text style={styles.section}>Account deletion</Text>
      <View style={styles.dangerCard}><Text style={styles.dangerTitle}>Delete employer account</Text><Text style={styles.dangerBody}>Permanently remove your employer login and organization profile directly from the app.</Text><TouchableOpacity disabled={deleting} onPress={remove} style={styles.delete}>{deleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteText}>Delete account</Text>}</TouchableOpacity></View>
      <Text style={styles.footer}>Elite Bridge Employer and Elite Bridge Caregiver are separate applications connected through the same care marketplace.</Text>
    </ScrollView></SafeAreaView>
  );
}

function Row({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 44 }, profile: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 22 }, avatar: { alignItems: "center", backgroundColor: colors.green, borderRadius: 30, height: 60, justifyContent: "center", width: 60 }, avatarText: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" }, name: { color: colors.ink, fontSize: 20, fontWeight: "900", marginTop: 11 }, email: { color: colors.muted, fontSize: 13, marginTop: 4 }, badge: { backgroundColor: colors.greenSoft, borderRadius: 9, color: colors.green, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 10, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  section: { color: colors.ink, fontSize: 17, fontWeight: "900", marginBottom: 9, marginTop: 24 }, row: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 8, minHeight: 66, padding: 13 }, rowCopy: { flex: 1 }, rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" }, rowDetail: { color: colors.muted, fontSize: 11, marginTop: 4 }, chevron: { color: colors.green, fontSize: 25 },
  dangerCard: { backgroundColor: colors.dangerSoft, borderColor: "#F4C7C3", borderRadius: 16, borderWidth: 1, padding: 15 }, dangerTitle: { color: colors.danger, fontSize: 15, fontWeight: "900" }, dangerBody: { color: "#7A271A", fontSize: 12, lineHeight: 18, marginTop: 5 }, delete: { alignItems: "center", backgroundColor: colors.danger, borderRadius: 11, justifyContent: "center", marginTop: 13, minHeight: 46 }, deleteText: { color: "#FFFFFF", fontWeight: "900" }, footer: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 24, textAlign: "center" },
});
