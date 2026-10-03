import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getEmployerTeam, getStoredEmployer, inviteCaregiver, TeamMember } from "../lib/api";
import { colors } from "../lib/theme";
import { EmployerTabBar } from "../components/employer-tab-bar";

export default function TeamScreen() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ inviteUrl: string; appLink: string; emailSent: boolean; smsSent: boolean } | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) return router.replace("/sign-in");
      setTeam(await getEmployerTeam());
    } catch (error) { Alert.alert("Unable to load team", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleInvite = useCallback(async () => {
    if (inviteLoading) return;
    const firstName = inviteFirstName.trim();
    const lastName = inviteLastName.trim();
    const email = inviteEmail.trim().toLowerCase();
    const phone = invitePhone.trim();
    if (!firstName) {
      Alert.alert("Name needed", "Enter the caregiver's first name.");
      return;
    }
    if (!email && !phone) {
      Alert.alert("Contact needed", "Enter an email address or phone number so the invite can be delivered.");
      return;
    }
    try {
      setInviteLoading(true);
      const response = await inviteCaregiver({ firstName, lastName: lastName || undefined, email: email || undefined, phone: phone || undefined });
      setLastInvite({
        inviteUrl: response.inviteUrl,
        appLink: response.appLinks?.caregiver || response.inviteUrl,
        emailSent: response.emailSent,
        smsSent: response.smsSent,
      });
      setInviteFirstName("");
      setInviteLastName("");
      setInviteEmail("");
      setInvitePhone("");
      const sentBy = [response.emailSent ? "email" : "", response.smsSent ? "text" : ""].filter(Boolean).join(" and ");
      Alert.alert("Invitation ready", sentBy ? `The invite was sent by ${sentBy}.` : "The secure invitation link is ready to share.");
      await load(true);
    } catch (error) {
      Alert.alert("Could not create invite", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }, [inviteEmail, inviteFirstName, inviteLastName, inviteLoading, invitePhone, load]);

  const shareInvite = useCallback((mode: "email" | "text" | "open") => {
    if (!lastInvite) return;
    const message = `Join our care team on Elite Bridge.\n\nAccept your secure invitation: ${lastInvite.inviteUrl}\nDownload the caregiver app: ${lastInvite.appLink}`;
    if (mode === "email") void Linking.openURL(`mailto:?subject=${encodeURIComponent("Your Elite Bridge invitation")}&body=${encodeURIComponent(message)}`);
    if (mode === "text") void Linking.openURL(`sms:?body=${encodeURIComponent(message.replace(/\n\n/g, " "))}`);
    if (mode === "open") void Linking.openURL(lastInvite.appLink);
  }, [lastInvite]);

  return <SafeAreaView edges={["bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
    <View style={styles.summary}><View style={styles.summaryIcon}><Ionicons color="#FFFFFF" name="people" size={25} /></View><View style={styles.summaryCopy}><Text style={styles.summaryTitle}>{team.length} team {team.length === 1 ? "member" : "members"}</Text><Text style={styles.summaryBody}>Caregivers who accepted your invitation or received a shift assignment.</Text></View></View>
    <View style={styles.pipeline}><Text style={styles.pipelineText}>Still hiring?</Text><TouchableOpacity onPress={() => router.push("/applications")}><Text style={styles.pipelineLink}>Review applicants</Text></TouchableOpacity></View>
    <View style={styles.inviteCard}>
      <View style={styles.inviteHead}><View><Text style={styles.inviteTitle}>Invite caregiver</Text><Text style={styles.inviteBody}>Send one secure onboarding link by email, text, or both.</Text></View><View style={styles.inviteIcon}><Ionicons color={colors.green} name="paper-plane" size={20} /></View></View>
      <View style={styles.inputRow}><TextInput autoCapitalize="words" onChangeText={setInviteFirstName} placeholder="First name" placeholderTextColor={colors.muted} style={[styles.input, styles.inputHalf]} value={inviteFirstName} /><TextInput autoCapitalize="words" onChangeText={setInviteLastName} placeholder="Last name" placeholderTextColor={colors.muted} style={[styles.input, styles.inputHalf]} value={inviteLastName} /></View>
      <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" onChangeText={setInviteEmail} placeholder="Email address" placeholderTextColor={colors.muted} style={styles.input} value={inviteEmail} />
      <TextInput keyboardType="phone-pad" onChangeText={setInvitePhone} placeholder="Phone number for text invite" placeholderTextColor={colors.muted} style={styles.input} value={invitePhone} />
      <TouchableOpacity activeOpacity={0.85} disabled={inviteLoading} onPress={handleInvite} style={[styles.inviteButton, inviteLoading && styles.inviteButtonDisabled]}><Text style={styles.inviteButtonText}>{inviteLoading ? "Creating invite..." : "Send onboarding invite"}</Text></TouchableOpacity>
      {lastInvite ? <View style={styles.sharePanel}><Text style={styles.shareTitle}>Last invite is ready</Text><Text style={styles.shareBody}>{lastInvite.emailSent || lastInvite.smsSent ? `Sent by ${[lastInvite.emailSent ? "email" : "", lastInvite.smsSent ? "text" : ""].filter(Boolean).join(" and ")}.` : "Use the buttons below to share it manually."}</Text><View style={styles.shareActions}><TouchableOpacity onPress={() => shareInvite("email")} style={styles.shareButton}><Text style={styles.shareButtonText}>Email</Text></TouchableOpacity><TouchableOpacity onPress={() => shareInvite("text")} style={styles.shareButton}><Text style={styles.shareButtonText}>Text</Text></TouchableOpacity><TouchableOpacity onPress={() => shareInvite("open")} style={styles.shareButton}><Text style={styles.shareButtonText}>Open app</Text></TouchableOpacity></View></View> : null}
    </View>
    {loading ? <ActivityIndicator color={colors.green} size="large" style={styles.loader} /> : null}
    {!loading && team.length === 0 ? <View style={styles.empty}><Ionicons color={colors.green} name="person-add-outline" size={34} /><Text style={styles.emptyTitle}>Your team directory is ready</Text><Text style={styles.emptyBody}>Approve a caregiver application or let a qualified caregiver claim an instant shift. Their employee record will then appear here.</Text><TouchableOpacity onPress={() => router.push("/shifts")} style={styles.emptyButton}><Text style={styles.emptyButtonText}>Manage shifts</Text></TouchableOpacity></View> : null}
    {team.map((member) => {
      const open = expanded === member.user_id;
      const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`.toUpperCase();
      return <TouchableOpacity activeOpacity={0.85} key={member.user_id} onPress={() => setExpanded(open ? null : member.user_id)} style={styles.card}>
        <View style={styles.memberRow}><View style={styles.avatar}><Text style={styles.avatarText}>{initials || "CG"}</Text></View><View style={styles.memberCopy}><Text style={styles.name}>{member.first_name} {member.last_name}</Text><Text style={styles.status}>{member.upcoming_shifts > 0 ? `${member.upcoming_shifts} upcoming ${member.upcoming_shifts === 1 ? "shift" : "shifts"}` : "Active team member"}</Text></View><Ionicons color={colors.green} name={open ? "chevron-up" : "chevron-down"} size={20} /></View>
        {open ? <View style={styles.details}><View style={styles.metrics}><Metric label="Assigned" value={member.assigned_shifts} /><Metric label="Upcoming" value={member.upcoming_shifts} /><Metric label="Hours" value={Number(member.total_hours || 0).toFixed(1)} /></View>{member.certifications?.length ? <Text style={styles.credentials}>Credentials: {member.certifications.join(", ")}</Text> : <Text style={styles.credentials}>No credentials listed</Text>}<TouchableOpacity onPress={() => void Linking.openURL(`mailto:${member.email}`)} style={styles.contact}><Ionicons color={colors.green} name="mail-outline" size={18} /><Text style={styles.contactText}>{member.email}</Text></TouchableOpacity>{member.phone ? <TouchableOpacity onPress={() => void Linking.openURL(`tel:${member.phone}`)} style={styles.contact}><Ionicons color={colors.green} name="call-outline" size={18} /><Text style={styles.contactText}>{member.phone}</Text></TouchableOpacity> : null}</View> : null}
      </TouchableOpacity>;
    })}
  </ScrollView><EmployerTabBar /></SafeAreaView>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { padding: 20, paddingBottom: 42 }, summary: { alignItems: "center", backgroundColor: colors.greenDark, borderRadius: 18, flexDirection: "row", padding: 16 }, summaryIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, height: 50, justifyContent: "center", marginRight: 13, width: 50 }, summaryCopy: { flex: 1 }, summaryTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" }, summaryBody: { color: "#CEE2D8", fontSize: 11, lineHeight: 17, marginTop: 4 }, pipeline: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginVertical: 18 }, pipelineText: { color: colors.ink, fontSize: 14, fontWeight: "800" }, pipelineLink: { color: colors.green, fontSize: 13, fontWeight: "900" }, inviteCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginBottom: 18, padding: 16 }, inviteHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }, inviteTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" }, inviteBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, inviteIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 14, height: 42, justifyContent: "center", width: 42 }, inputRow: { flexDirection: "row", gap: 10 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 14, fontWeight: "700", marginBottom: 10, minHeight: 48, paddingHorizontal: 13 }, inputHalf: { flex: 1 }, inviteButton: { alignItems: "center", backgroundColor: colors.green, borderRadius: 13, paddingVertical: 14 }, inviteButtonDisabled: { opacity: 0.65 }, inviteButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" }, sharePanel: { backgroundColor: colors.greenSoft, borderRadius: 14, marginTop: 12, padding: 12 }, shareTitle: { color: colors.ink, fontSize: 13, fontWeight: "900" }, shareBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, shareActions: { flexDirection: "row", gap: 8, marginTop: 10 }, shareButton: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 9 }, shareButtonText: { color: colors.green, fontSize: 11, fontWeight: "900", textAlign: "center" }, loader: { marginTop: 45 }, empty: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, padding: 26 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 10 }, emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: "center" }, emptyButton: { borderColor: colors.green, borderRadius: 11, borderWidth: 1, marginTop: 16, paddingHorizontal: 18, paddingVertical: 11 }, emptyButtonText: { color: colors.green, fontWeight: "900" }, card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 17, borderWidth: 1, marginBottom: 10, padding: 14 }, memberRow: { alignItems: "center", flexDirection: "row" }, avatar: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 22, height: 44, justifyContent: "center", marginRight: 12, width: 44 }, avatarText: { color: colors.green, fontSize: 14, fontWeight: "900" }, memberCopy: { flex: 1 }, name: { color: colors.ink, fontSize: 15, fontWeight: "900" }, status: { color: colors.green, fontSize: 11, fontWeight: "700", marginTop: 4 }, details: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 13, paddingTop: 13 }, metrics: { flexDirection: "row", gap: 8 }, metric: { alignItems: "center", backgroundColor: colors.background, borderRadius: 11, flex: 1, padding: 10 }, metricValue: { color: colors.ink, fontSize: 16, fontWeight: "900" }, metricLabel: { color: colors.muted, fontSize: 9, marginTop: 3 }, credentials: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 12 }, contact: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 11 }, contactText: { color: colors.green, flex: 1, fontSize: 12, fontWeight: "800" },
});
