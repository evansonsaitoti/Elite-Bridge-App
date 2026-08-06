import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

type Candidate = {
  id: string;
  name: string;
  role: string;
  city: string;
  distanceMiles: number;
  available: boolean;
  credentialFit: number;
  continuityVisits: number;
  reliability: number;
  weeklyHours: number;
  languageFit: number;
  recentDeclines: number;
};

const shift = {
  client: "Mary Thompson",
  service: "Personal Care",
  city: "Dracut, MA",
  time: "Tonight · 7:00 PM – 11:00 PM",
  rate: "$38/hr",
  requiredRole: "Caregiver / HHA",
};

const candidates: Candidate[] = [
  {
    id: "sarah",
    name: "Sarah Johnson",
    role: "Caregiver",
    city: "Lowell",
    distanceMiles: 4.8,
    available: true,
    credentialFit: 100,
    continuityVisits: 9,
    reliability: 97,
    weeklyHours: 27,
    languageFit: 100,
    recentDeclines: 0,
  },
  {
    id: "emily",
    name: "Emily Rodriguez",
    role: "Home Health Aide",
    city: "Tyngsborough",
    distanceMiles: 8.1,
    available: true,
    credentialFit: 100,
    continuityVisits: 2,
    reliability: 99,
    weeklyHours: 34,
    languageFit: 100,
    recentDeclines: 0,
  },
  {
    id: "james",
    name: "James Wilson",
    role: "Caregiver",
    city: "Chelmsford",
    distanceMiles: 10.6,
    available: true,
    credentialFit: 100,
    continuityVisits: 0,
    reliability: 91,
    weeklyHours: 38,
    languageFit: 100,
    recentDeclines: 1,
  },
  {
    id: "michael",
    name: "Michael Brown",
    role: "Companion",
    city: "Methuen",
    distanceMiles: 15.2,
    available: true,
    credentialFit: 68,
    continuityVisits: 5,
    reliability: 96,
    weeklyHours: 22,
    languageFit: 100,
    recentDeclines: 0,
  },
];

function scoreCandidate(candidate: Candidate) {
  const distance = Math.max(0, 100 - candidate.distanceMiles * 4.5);
  const continuity = Math.min(100, candidate.continuityVisits * 11);
  const overtimeSafety = candidate.weeklyHours <= 32 ? 100 : candidate.weeklyHours <= 36 ? 82 : candidate.weeklyHours < 40 ? 58 : 20;
  const declinePenalty = candidate.recentDeclines * 8;

  const weighted =
    candidate.credentialFit * 0.25 +
    (candidate.available ? 100 : 0) * 0.2 +
    distance * 0.15 +
    continuity * 0.15 +
    candidate.reliability * 0.13 +
    overtimeSafety * 0.08 +
    candidate.languageFit * 0.04 -
    declinePenalty;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

function explanation(candidate: Candidate) {
  const reasons: string[] = [];
  if (candidate.credentialFit >= 95) reasons.push("fully qualified");
  if (candidate.distanceMiles <= 6) reasons.push(`${candidate.distanceMiles.toFixed(1)} mi away`);
  if (candidate.continuityVisits >= 5) reasons.push(`${candidate.continuityVisits} prior visits with Mary`);
  if (candidate.weeklyHours <= 32) reasons.push("low overtime risk");
  if (candidate.reliability >= 97) reasons.push(`${candidate.reliability}% reliability`);
  if (candidate.weeklyHours >= 37) reasons.push("approaching overtime");
  if (candidate.credentialFit < 90) reasons.push("role/credential mismatch risk");
  return reasons.slice(0, 4);
}

export default function CoverageCopilotScreen() {
  const router = useRouter();
  const [offerSentTo, setOfferSentTo] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>("sarah");
  const [radius, setRadius] = useState(12);

  const ranked = useMemo(
    () => candidates
      .filter((candidate) => candidate.distanceMiles <= radius)
      .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate) }))
      .sort((a, b) => b.score - a.score),
    [radius],
  );

  const top = ranked[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Dashboard</Text>
          </TouchableOpacity>
          <View style={styles.aiPill}><Text style={styles.aiPillText}>ELITE AI</Text></View>
        </View>

        <Text style={styles.eyebrow}>COVERAGE COPILOT</Text>
        <Text style={styles.heading}>Rescue this shift</Text>
        <Text style={styles.subheading}>Elite ranks eligible workers by qualifications, availability, travel, continuity, reliability and overtime exposure.</Text>

        <View style={styles.shiftCard}>
          <View style={styles.riskRow}>
            <Text style={styles.riskPill}>HIGH FILL RISK</Text>
            <Text style={styles.rate}>{shift.rate}</Text>
          </View>
          <Text style={styles.shiftTitle}>{shift.service} · {shift.client}</Text>
          <Text style={styles.shiftMeta}>{shift.time}</Text>
          <Text style={styles.shiftMeta}>{shift.city} · {shift.requiredRole}</Text>
        </View>

        {top ? (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationEyebrow}>ELITE RECOMMENDS</Text>
            <View style={styles.recommendationRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recommendationName}>{top.name}</Text>
                <Text style={styles.recommendationMeta}>{top.role} · {top.city}</Text>
              </View>
              <View style={styles.scoreCircle}><Text style={styles.scoreText}>{top.score}</Text></View>
            </View>
            <Text style={styles.recommendationBody}>
              Best overall fit because {explanation(top).join(", ")}. Elite predicts this option has the lowest operational risk for tonight.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, offerSentTo === top.id && styles.primaryButtonSent]}
              onPress={() => setOfferSentTo(top.id)}
            >
              <Text style={styles.primaryButtonText}>{offerSentTo === top.id ? "Offer sent ✓" : `Send priority offer to ${top.name.split(" ")[0]}`}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Ranked matches</Text>
            <Text style={styles.sectionSub}>{ranked.length} candidates within {radius} miles</Text>
          </View>
          <TouchableOpacity style={styles.radiusButton} onPress={() => setRadius(radius === 12 ? 20 : 12)}>
            <Text style={styles.radiusButtonText}>{radius === 12 ? "Expand to 20 mi" : "Use 12 mi"}</Text>
          </TouchableOpacity>
        </View>

        {ranked.map((candidate, index) => {
          const isExpanded = expandedId === candidate.id;
          const reasons = explanation(candidate);
          const overtimeRisk = candidate.weeklyHours >= 37;
          return (
            <View key={candidate.id} style={styles.candidateCard}>
              <TouchableOpacity style={styles.candidateHeader} onPress={() => setExpandedId(isExpanded ? null : candidate.id)}>
                <View style={styles.rankBadge}><Text style={styles.rankText}>#{index + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candidateName}>{candidate.name}</Text>
                  <Text style={styles.candidateMeta}>{candidate.role} · {candidate.city} · {candidate.distanceMiles.toFixed(1)} mi</Text>
                </View>
                <View style={[styles.scoreBadge, candidate.score >= 85 ? styles.scoreBadgeStrong : styles.scoreBadgeOkay]}>
                  <Text style={styles.scoreBadgeText}>{candidate.score}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.chipRow}>
                <Text style={styles.goodChip}>{candidate.reliability}% reliable</Text>
                <Text style={overtimeRisk ? styles.riskChip : styles.goodChip}>{candidate.weeklyHours}h this week</Text>
                {candidate.continuityVisits > 0 ? <Text style={styles.goodChip}>{candidate.continuityVisits} prior visits</Text> : null}
              </View>

              {isExpanded ? (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationTitle}>Why Elite ranked this worker</Text>
                  {reasons.map((reason) => <Text key={reason} style={styles.reason}>• {reason}</Text>)}
                  <View style={styles.factorGrid}>
                    <View style={styles.factor}><Text style={styles.factorValue}>{candidate.credentialFit}%</Text><Text style={styles.factorLabel}>credential fit</Text></View>
                    <View style={styles.factor}><Text style={styles.factorValue}>{candidate.reliability}%</Text><Text style={styles.factorLabel}>reliability</Text></View>
                    <View style={styles.factor}><Text style={styles.factorValue}>{candidate.weeklyHours}h</Text><Text style={styles.factorLabel}>weekly hours</Text></View>
                  </View>
                  <TouchableOpacity
                    style={[styles.secondaryButton, offerSentTo === candidate.id && styles.secondaryButtonSent]}
                    onPress={() => setOfferSentTo(candidate.id)}
                  >
                    <Text style={styles.secondaryButtonText}>{offerSentTo === candidate.id ? "Offer sent ✓" : "Send shift offer"}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}

        {ranked.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No eligible workers in this radius</Text>
            <Text style={styles.emptyBody}>Expand the search radius or ask Elite to suggest an agency escalation plan.</Text>
          </View>
        ) : null}

        <View style={styles.guardrailCard}>
          <Text style={styles.guardrailEyebrow}>HUMAN-IN-THE-LOOP</Text>
          <Text style={styles.guardrailTitle}>AI recommends. Your scheduler decides.</Text>
          <Text style={styles.guardrailBody}>Coverage Copilot explains every ranking and never assigns a worker automatically without agency confirmation.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F9F8" },
  content: { padding: 20, paddingBottom: 50 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  backButton: { paddingVertical: 8, paddingRight: 12 },
  backText: { color: "#0A4A35", fontSize: 14, fontWeight: "800" },
  aiPill: { backgroundColor: "#0A4A35", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  aiPillText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  eyebrow: { color: "#C58A24", fontSize: 11, fontWeight: "900", letterSpacing: 1.8 },
  heading: { color: "#101828", fontSize: 32, fontWeight: "900", letterSpacing: -0.6, marginTop: 5 },
  subheading: { color: "#667085", fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 18 },
  shiftCard: { backgroundColor: "#101828", borderRadius: 20, padding: 18, marginBottom: 14 },
  riskRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  riskPill: { color: "#F97066", backgroundColor: "#3A2023", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  rate: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  shiftTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginTop: 15 },
  shiftMeta: { color: "#D0D5DD", fontSize: 13, marginTop: 5 },
  recommendationCard: { backgroundColor: "#EAF4EF", borderColor: "#B7D7C9", borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 28 },
  recommendationEyebrow: { color: "#0A4A35", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  recommendationRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  recommendationName: { color: "#101828", fontSize: 21, fontWeight: "900" },
  recommendationMeta: { color: "#475467", fontSize: 12, marginTop: 3 },
  scoreCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#0A4A35", alignItems: "center", justifyContent: "center" },
  scoreText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  recommendationBody: { color: "#344054", fontSize: 13, lineHeight: 20, marginTop: 12 },
  primaryButton: { backgroundColor: "#0A4A35", borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 15, paddingHorizontal: 12 },
  primaryButtonSent: { backgroundColor: "#087443" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", textAlign: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#101828", fontSize: 20, fontWeight: "900" },
  sectionSub: { color: "#667085", fontSize: 11, marginTop: 3 },
  radiusButton: { backgroundColor: "#FFFFFF", borderColor: "#D0D5DD", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  radiusButtonText: { color: "#0A4A35", fontSize: 10, fontWeight: "800" },
  candidateCard: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderWidth: 1, borderRadius: 17, marginBottom: 10, overflow: "hidden" },
  candidateHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
  rankBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F2F4F7", alignItems: "center", justifyContent: "center", marginRight: 10 },
  rankText: { color: "#475467", fontSize: 11, fontWeight: "900" },
  candidateName: { color: "#101828", fontSize: 15, fontWeight: "900" },
  candidateMeta: { color: "#667085", fontSize: 11, marginTop: 3 },
  scoreBadge: { minWidth: 42, borderRadius: 999, alignItems: "center", paddingVertical: 7, paddingHorizontal: 9 },
  scoreBadgeStrong: { backgroundColor: "#EAF7EF" },
  scoreBadgeOkay: { backgroundColor: "#FFF6E6" },
  scoreBadgeText: { color: "#0A4A35", fontSize: 12, fontWeight: "900" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14, paddingBottom: 13 },
  goodChip: { color: "#087443", backgroundColor: "#ECFDF3", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, fontSize: 9, fontWeight: "800" },
  riskChip: { color: "#B54708", backgroundColor: "#FFFAEB", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, fontSize: 9, fontWeight: "800" },
  explanationBox: { borderTopWidth: 1, borderTopColor: "#EAECF0", padding: 14, backgroundColor: "#FCFCFD" },
  explanationTitle: { color: "#344054", fontSize: 12, fontWeight: "900", marginBottom: 6 },
  reason: { color: "#667085", fontSize: 11, lineHeight: 18 },
  factorGrid: { flexDirection: "row", gap: 7, marginTop: 12 },
  factor: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: "#EAECF0", padding: 9 },
  factorValue: { color: "#101828", fontSize: 13, fontWeight: "900" },
  factorLabel: { color: "#98A2B3", fontSize: 8, marginTop: 2 },
  secondaryButton: { marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: "#0A4A35", paddingVertical: 10, alignItems: "center" },
  secondaryButtonSent: { backgroundColor: "#EAF7EF" },
  secondaryButtonText: { color: "#0A4A35", fontSize: 11, fontWeight: "900" },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#EAECF0" },
  emptyTitle: { color: "#101828", fontSize: 15, fontWeight: "900" },
  emptyBody: { color: "#667085", fontSize: 12, lineHeight: 18, marginTop: 5 },
  guardrailCard: { backgroundColor: "#FFF9ED", borderRadius: 17, padding: 17, marginTop: 20 },
  guardrailEyebrow: { color: "#B54708", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  guardrailTitle: { color: "#101828", fontSize: 16, fontWeight: "900", marginTop: 6 },
  guardrailBody: { color: "#667085", fontSize: 12, lineHeight: 18, marginTop: 5 },
});
