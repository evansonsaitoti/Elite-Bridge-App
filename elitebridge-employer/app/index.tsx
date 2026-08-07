import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const stats = [
  { value: "3", label: "Open shifts", tone: "#FDECEC", valueColor: "#B42318" },
  { value: "12", label: "Working today", tone: "#EAF7EF", valueColor: "#087443" },
  { value: "2", label: "Timesheets", tone: "#EEF4FF", valueColor: "#175CD3" },
  { value: "1", label: "At-risk shift", tone: "#FFF6E6", valueColor: "#B54708" },
];

const intelligence = [
  {
    eyebrow: "COVERAGE COPILOT",
    title: "Tonight’s 7 PM shift needs attention",
    body: "I found 4 eligible caregivers. Sarah is the strongest match based on availability, travel time, continuity and overtime risk.",
    action: "Review matches",
    route: "/coverage" as const,
  },
  {
    eyebrow: "COMPLIANCE COPILOT",
    title: "3 items need review this week",
    body: "One credential expires in 8 days, one worker acknowledgment is missing, and your Massachusetts profile has compliance signals to review.",
    action: "Open compliance inbox",
    route: "/compliance" as const,
  },
];

export default function EmployerHome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>ELITE BRIDGE</Text>
            <Text style={styles.brandSub}>EMPLOYER</Text>
          </View>
          <View style={styles.maBadge}><Text style={styles.maBadgeText}>MA PILOT</Text></View>
        </View>

        <Text style={styles.heading}>Good evening</Text>
        <Text style={styles.subheading}>Here’s what needs your attention before tomorrow.</Text>

        <View style={styles.statGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.tone }]}>
              <Text style={[styles.statValue, { color: stat.valueColor }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.commandCard}>
          <Text style={styles.commandEyebrow}>ASK ELITE AI</Text>
          <Text style={styles.commandTitle}>What do you want to get done?</Text>
          <TouchableOpacity style={styles.commandInput} onPress={() => router.push("/ask-elite")}>
            <Text style={styles.commandPlaceholder}>“Who can cover Mary tomorrow without overtime?”</Text>
          </TouchableOpacity>
          <View style={styles.promptRow}>
            <TouchableOpacity onPress={() => router.push("/ask-elite")}><Text style={styles.promptChip}>Fill a shift</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/ask-elite")}><Text style={styles.promptChip}>Check overtime</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/ask-elite")}><Text style={styles.promptChip}>Expiring credentials</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Operations inbox</Text>
          <TouchableOpacity onPress={() => router.push("/compliance")}><Text style={styles.sectionLink}>See all</Text></TouchableOpacity>
        </View>

        {intelligence.map((item) => (
          <View key={item.eyebrow} style={styles.aiCard}>
            <Text style={styles.aiEyebrow}>{item.eyebrow}</Text>
            <Text style={styles.aiTitle}>{item.title}</Text>
            <Text style={styles.aiBody}>{item.body}</Text>
            <TouchableOpacity style={styles.aiButton} onPress={() => router.push(item.route)}>
              <Text style={styles.aiButtonText}>{item.action}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today</Text>
          <TouchableOpacity onPress={() => router.push("/schedule")}><Text style={styles.sectionLink}>Schedule</Text></TouchableOpacity>
        </View>

        <View style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <View style={styles.timeBadge}><Text style={styles.timeBadgeText}>3 PM</Text></View>
            <View style={styles.scheduleCopy}>
              <Text style={styles.scheduleTitle}>Companionship · Robert Davis</Text>
              <Text style={styles.scheduleMeta}>Sarah Johnson · Lowell</Text>
            </View>
            <Text style={styles.covered}>Covered</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.scheduleRow} onPress={() => router.push("/coverage")}>
            <View style={[styles.timeBadge, styles.timeBadgeRisk]}><Text style={[styles.timeBadgeText, styles.timeBadgeRiskText]}>7 PM</Text></View>
            <View style={styles.scheduleCopy}>
              <Text style={styles.scheduleTitle}>Personal Care · Mary Thompson</Text>
              <Text style={styles.scheduleMeta}>Unassigned · Dracut</Text>
            </View>
            <Text style={styles.atRisk}>Rescue →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>Massachusetts-first workforce operations for care agencies.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F9F8" },
  content: { padding: 20, paddingBottom: 48 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  brand: { color: "#0A4A35", fontSize: 16, fontWeight: "900", letterSpacing: 1.4 },
  brandSub: { marginTop: 2, color: "#C58A24", fontSize: 11, fontWeight: "900", letterSpacing: 2.2 },
  maBadge: { backgroundColor: "#EAF4EF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  maBadgeText: { color: "#0A4A35", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heading: { color: "#101828", fontSize: 32, fontWeight: "900", letterSpacing: -0.7 },
  subheading: { color: "#667085", fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 20 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  statCard: { width: "48%", minHeight: 108, borderRadius: 18, padding: 16, justifyContent: "center" },
  statValue: { fontSize: 28, fontWeight: "900" },
  statLabel: { color: "#475467", fontSize: 13, fontWeight: "700", marginTop: 4 },
  commandCard: { backgroundColor: "#0A4A35", borderRadius: 22, padding: 18, marginBottom: 28 },
  commandEyebrow: { color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  commandTitle: { color: "#FFFFFF", fontSize: 22, lineHeight: 28, fontWeight: "900", marginTop: 7, marginBottom: 14 },
  commandInput: { backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 15 },
  commandPlaceholder: { color: "#667085", fontSize: 13, lineHeight: 19 },
  promptRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  promptChip: { overflow: "hidden", color: "#D8E9E2", backgroundColor: "#176148", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, fontSize: 11, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 12 },
  sectionTitle: { color: "#101828", fontSize: 20, fontWeight: "900" },
  sectionLink: { color: "#0A4A35", fontSize: 13, fontWeight: "800" },
  aiCard: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E4E7EC", padding: 17, marginBottom: 12 },
  aiEyebrow: { color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  aiTitle: { color: "#101828", fontSize: 17, lineHeight: 23, fontWeight: "900", marginTop: 7 },
  aiBody: { color: "#667085", fontSize: 13, lineHeight: 20, marginTop: 7 },
  aiButton: { marginTop: 14, alignSelf: "flex-start", backgroundColor: "#ECF6F1", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  aiButtonText: { color: "#0A4A35", fontSize: 12, fontWeight: "900" },
  scheduleCard: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E4E7EC", paddingHorizontal: 14, paddingVertical: 4 },
  scheduleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  timeBadge: { width: 50, backgroundColor: "#EAF7EF", paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  timeBadgeText: { color: "#087443", fontSize: 12, fontWeight: "900" },
  timeBadgeRisk: { backgroundColor: "#FFF6E6" },
  timeBadgeRiskText: { color: "#B54708" },
  scheduleCopy: { flex: 1, paddingHorizontal: 11 },
  scheduleTitle: { color: "#101828", fontSize: 13, fontWeight: "800" },
  scheduleMeta: { color: "#667085", fontSize: 12, marginTop: 4 },
  covered: { color: "#087443", fontSize: 11, fontWeight: "900" },
  atRisk: { color: "#B42318", fontSize: 11, fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#EAECF0" },
  footerNote: { color: "#98A2B3", textAlign: "center", fontSize: 11, marginTop: 28 },
});