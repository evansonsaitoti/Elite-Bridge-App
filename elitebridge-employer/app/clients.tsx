import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { EmployerTabBar } from "../components/employer-tab-bar";
import { cardShadow, colors } from "../lib/theme";

const tools = [
  {
    icon: "person-outline",
    title: "Client profiles",
    detail: "Track client names, care recipients, preferred schedules, and service notes before posting care.",
  },
  {
    icon: "document-text-outline",
    title: "Contracts",
    detail: "Keep contract preparation connected to the same client details used by the web dashboard.",
  },
  {
    icon: "calendar-outline",
    title: "Care schedule",
    detail: "Use posted shifts to turn a client request into caregiver coverage quickly.",
  },
  {
    icon: "cash-outline",
    title: "Rates",
    detail: "Keep hourly rates visible before creating a contract or care opportunity.",
  },
] as const;

export default function ClientsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>CLIENTS & CONTRACTS</Text>
          <Text style={styles.title}>Keep every client ready for care.</Text>
          <Text style={styles.body}>Use this area to organize client details, rates, schedules, and contract preparation so the mobile app stays aligned with the web dashboard.</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => router.push("/post-shift")} style={styles.primary}><Ionicons color="#FFFFFF" name="add-circle-outline" size={18} /><Text style={styles.primaryText}>Post shift</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/operations")} style={styles.secondary}><Ionicons color={colors.green} name="clipboard-outline" size={18} /><Text style={styles.secondaryText}>Operations</Text></TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Client workflow</Text>
        {tools.map((tool) => (
          <View key={tool.title} style={styles.toolCard}>
            <View style={styles.toolIcon}><Ionicons color={colors.green} name={tool.icon} size={22} /></View>
            <View style={styles.toolCopy}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDetail}>{tool.detail}</Text>
            </View>
          </View>
        ))}

        <View style={styles.noteCard}>
          <Ionicons color={colors.gold} name="sparkles-outline" size={22} />
          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>Synced with the web contract flow</Text>
            <Text style={styles.noteBody}>The web dashboard remains the best place to preview, download, and email the one-page PDF contract while the employer app keeps the same client workflow visible on mobile.</Text>
          </View>
        </View>
      </ScrollView>
      <EmployerTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 42 },
  hero: { ...cardShadow, backgroundColor: colors.greenDark, borderRadius: 24, marginBottom: 22, padding: 18 },
  kicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", lineHeight: 33, marginTop: 9 },
  body: { color: "#D9E9E2", fontSize: 13, lineHeight: 20, marginTop: 8 },
  heroActions: { flexDirection: "row", gap: 9, marginTop: 16 },
  primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48 },
  secondary: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  secondaryText: { color: colors.green, fontSize: 13, fontWeight: "900" },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "900", marginBottom: 12 },
  toolCard: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", marginBottom: 10, padding: 14 },
  toolIcon: { alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 13, height: 44, justifyContent: "center", marginRight: 12, width: 44 },
  toolCopy: { flex: 1 },
  toolTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  toolDetail: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  noteCard: { alignItems: "flex-start", backgroundColor: colors.warningSoft, borderColor: "#F4D7A1", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 11, marginTop: 10, padding: 15 },
  noteCopy: { flex: 1 },
  noteTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  noteBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
