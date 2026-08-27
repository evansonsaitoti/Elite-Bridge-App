import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getEmployerSession, getLocalScheduleShifts, isDemoEmployerSession, type EmployerScheduleShift } from "../lib/employer-storage";
import {
  fetchEmployerCallouts,
  fetchEmployerShifts,
  launchCalloutRescue,
  sharedApiConfigured,
  type EmployerCallout,
  type RescueCandidate,
  type SharedShift,
} from "../lib/shared-api";

type RescueResult = {
  offersSent: number;
  candidates: RescueCandidate[];
  note: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Scheduled shift";
  return date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function readableReason(reason: string) {
  return reason.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function localShiftToShared(shift: EmployerScheduleShift): SharedShift {
  const [city = "Lowell", state = "MA"] = shift.location.split(",").map((item) => item.trim());
  return {
    id: Number(shift.id) || Date.now(),
    employerId: 1,
    employerName: "Elite Bridge Local Agency",
    title: `${shift.service} · ${shift.client}`,
    serviceType: shift.service,
    caregiverType: "Caregiver",
    careRecipientName: shift.client,
    startTime: shift.createdAt,
    endTime: new Date(new Date(shift.createdAt).getTime() + 1000 * 60 * 60 * 4).toISOString(),
    location: { type: "client_home", address: shift.location, city, state, zipCode: "01852" },
    hourlyRate: shift.hourlyRate || 35,
    requirements: [],
    responsibilities: "Local preview shift created in Schedule.",
    urgency: shift.status === "At risk" ? "urgent" : "standard",
    status: shift.status === "Covered" ? "assigned" : "open",
  };
}

export default function CoverageCopilotScreen() {
  const router = useRouter();
  const [callouts, setCallouts] = useState<EmployerCallout[]>([]);
  const [shifts, setShifts] = useState<SharedShift[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rescuingId, setRescuingId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, RescueResult>>({});
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = async () => {
    const session = await getEmployerSession();
    if (isDemoEmployerSession(session) || !sharedApiConfigured) {
      const local = await getLocalScheduleShifts();
      setCallouts([]);
      setShifts(local.map(localShiftToShared));
      setLoading(false);
      setSyncError(null);
      return;
    }
    try {
      setRefreshing(true);
      setSyncError(null);
      const [liveCallouts, liveShifts] = await Promise.all([fetchEmployerCallouts(), fetchEmployerShifts()]);
      setCallouts(liveCallouts);
      setShifts(liveShifts);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not load coverage operations.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openCallouts = callouts.filter((item) => item.status === "open");
  const atRiskShifts = useMemo(
    () => shifts
      .filter((shift) => shift.status === "open")
      .sort((a, b) => {
        if (a.urgency !== b.urgency) return a.urgency === "urgent" ? -1 : 1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      })
      .slice(0, 6),
    [shifts],
  );

  const launch = async (callout: EmployerCallout) => {
    try {
      setRescuingId(callout.id);
      const result = await launchCalloutRescue(callout.id);
      setResults((current) => ({ ...current, [callout.id]: result }));
      await refresh();
      Alert.alert(
        result.offersSent > 0 ? "Priority outreach sent" : "No eligible matches yet",
        result.offersSent > 0
          ? `Elite sent ${result.offersSent} priority ${result.offersSent === 1 ? "offer" : "offers"}. Caregivers must opt in and your agency still approves the final assignment.`
          : "No additional available caregivers were found. Keep the shift open and use your normal agency escalation process.",
      );
    } catch (error) {
      Alert.alert("Could not launch rescue", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRescuingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Operations</Text>
          </TouchableOpacity>
          <View style={styles.aiPill}><Text style={styles.aiPillText}>ELITE AI</Text></View>
        </View>

        <Text style={styles.eyebrow}>COVERAGE COPILOT</Text>
        <Text style={styles.heading}>Rescue coverage without losing control.</Text>
        <Text style={styles.subheading}>Live call-outs appear here. Elite ranks available caregivers and can send priority offers, while the scheduler keeps final assignment authority.</Text>

        {loading ? <ActivityIndicator color="#0A4A35" style={{ marginVertical: 32 }} /> : null}
        {syncError ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Coverage sync needs attention</Text><Text style={styles.errorText}>{syncError}</Text><TouchableOpacity onPress={() => void refresh()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : null}

        {!loading && !syncError ? (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}><Text style={styles.summaryValue}>{openCallouts.length}</Text><Text style={styles.summaryLabel}>Open call-outs</Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryValue}>{atRiskShifts.length}</Text><Text style={styles.summaryLabel}>Open shifts</Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryValue}>{callouts.reduce((sum, item) => sum + Number(item.offers_accepted || 0), 0)}</Text><Text style={styles.summaryLabel}>Offers accepted</Text></View>
            </View>

            <Text style={styles.sectionTitle}>Urgent call-outs</Text>
            {openCallouts.map((callout) => {
              const result = results[callout.id];
              return (
                <View key={callout.id} style={styles.calloutCard}>
                  <View style={styles.riskRow}>
                    <Text style={styles.riskPill}>URGENT COVERAGE</Text>
                    <Text style={styles.rate}>${Number(callout.hourly_rate).toFixed(0)}/hr</Text>
                  </View>
                  <Text style={styles.shiftTitle}>{callout.service_type}{callout.care_recipient_name ? ` · ${callout.care_recipient_name}` : ""}</Text>
                  <Text style={styles.shiftMeta}>{formatDateTime(callout.start_time)} · {callout.city}, {callout.state}</Text>
                  <Text style={styles.shiftMeta}>Called out: {callout.first_name} {callout.last_name} · {readableReason(callout.reason)}</Text>
                  {callout.note ? <Text style={styles.note}>{callout.note}</Text> : null}

                  <View style={styles.offerStatusRow}>
                    <Text style={styles.offerStatus}>{callout.offers_sent} offers sent</Text>
                    <Text style={styles.offerStatus}>{callout.offers_accepted} accepted</Text>
                  </View>

                  <TouchableOpacity
                    disabled={rescuingId === callout.id}
                    style={[styles.primaryButton, rescuingId === callout.id && { opacity: 0.65 }]}
                    onPress={() => void launch(callout)}
                  >
                    <Text style={styles.primaryButtonText}>{rescuingId === callout.id ? "Ranking caregivers…" : callout.offers_sent > 0 ? "Refresh priority outreach" : "Launch Coverage Rescue"}</Text>
                  </TouchableOpacity>

                  {result ? (
                    <View style={styles.resultBox}>
                      <Text style={styles.resultTitle}>Ranked outreach</Text>
                      {result.candidates.map((candidate, index) => (
                        <View key={candidate.caregiverId} style={styles.candidateRow}>
                          <View style={styles.rank}><Text style={styles.rankText}>#{index + 1}</Text></View>
                          <View style={{ flex: 1 }}><Text style={styles.candidateName}>{candidate.name}</Text><Text style={styles.candidateWhy}>{candidate.rationale}</Text></View>
                          <View style={styles.score}><Text style={styles.scoreText}>{candidate.score}</Text></View>
                        </View>
                      ))}
                      {result.candidates.length === 0 ? <Text style={styles.emptyText}>No eligible additional caregivers were available.</Text> : null}
                      <Text style={styles.resultNote}>{result.note}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            {openCallouts.length === 0 ? (
              <View style={styles.goodCard}>
                <Text style={styles.goodEyebrow}>NO OPEN CALL-OUTS</Text>
                <Text style={styles.goodTitle}>Coverage rescue queue is clear.</Text>
                <Text style={styles.goodText}>If an assigned caregiver reports a call-out in Elite Bridge, the shift will reopen as urgent and appear here automatically.</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Open shift risk</Text><Text style={styles.sectionSub}>Unassigned work ordered by urgency and start time.</Text></View>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/schedule")}><Text style={styles.secondaryButtonText}>Schedule</Text></TouchableOpacity>
            </View>

            {atRiskShifts.map((shift) => (
              <View key={shift.id} style={styles.shiftRiskCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.openShiftTitle}>{shift.serviceType}{shift.careRecipientName ? ` · ${shift.careRecipientName}` : ""}</Text>
                  <Text style={styles.openShiftMeta}>{formatDateTime(shift.startTime)} · {shift.location.city}, {shift.location.state}</Text>
                </View>
                <View style={[styles.urgencyBadge, shift.urgency === "urgent" && styles.urgencyBadgeHot]}><Text style={styles.urgencyText}>{shift.urgency.toUpperCase()}</Text></View>
              </View>
            ))}
            {atRiskShifts.length === 0 ? <Text style={styles.emptyText}>No unassigned shifts need coverage right now.</Text> : null}

            <TouchableOpacity style={styles.applicationsButton} onPress={() => router.push("/applications")}><Text style={styles.applicationsText}>Review caregiver applications</Text></TouchableOpacity>

            <View style={styles.guardrailCard}>
              <Text style={styles.guardrailEyebrow}>HUMAN-IN-THE-LOOP</Text>
              <Text style={styles.guardrailTitle}>AI recommends. Your scheduler decides.</Text>
              <Text style={styles.guardrailBody}>Coverage Copilot never assigns a caregiver automatically. Caregivers opt into priority offers and an authorized employer approves the final application.</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F9F8" }, content: { padding: 20, paddingBottom: 50 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }, backButton: { paddingVertical: 8, paddingRight: 12 }, backText: { color: "#0A4A35", fontSize: 14, fontWeight: "800" },
  aiPill: { backgroundColor: "#0A4A35", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 }, aiPillText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  eyebrow: { color: "#C58A24", fontSize: 11, fontWeight: "900", letterSpacing: 1.8 }, heading: { color: "#101828", fontSize: 30, lineHeight: 36, fontWeight: "900", letterSpacing: -0.6, marginTop: 5 }, subheading: { color: "#667085", fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 18 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 24 }, summaryCard: { flex: 1, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 12 }, summaryValue: { color: "#0A4A35", fontSize: 24, fontWeight: "900" }, summaryLabel: { color: "#667085", fontSize: 10, fontWeight: "700", marginTop: 3 },
  sectionTitle: { color: "#101828", fontSize: 20, fontWeight: "900", marginBottom: 10 }, sectionSub: { color: "#667085", fontSize: 11, marginTop: -6 }, sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, marginBottom: 10 },
  calloutCard: { backgroundColor: "#101828", borderRadius: 20, padding: 18, marginBottom: 14 }, riskRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, riskPill: { color: "#F97066", backgroundColor: "#3A2023", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, rate: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  shiftTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginTop: 15 }, shiftMeta: { color: "#D0D5DD", fontSize: 12, lineHeight: 18, marginTop: 5 }, note: { color: "#EBCB8B", fontSize: 12, lineHeight: 18, marginTop: 8 }, offerStatusRow: { flexDirection: "row", gap: 8, marginTop: 12 }, offerStatus: { color: "#D0D5DD", backgroundColor: "#344054", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, fontSize: 10, fontWeight: "800", overflow: "hidden" },
  primaryButton: { backgroundColor: "#FFFFFF", borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 14 }, primaryButtonText: { color: "#0A4A35", fontSize: 13, fontWeight: "900" },
  resultBox: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 13, marginTop: 12 }, resultTitle: { color: "#101828", fontWeight: "900", marginBottom: 6 }, candidateRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#EAECF0" }, rank: { width: 32, height: 32, borderRadius: 9, backgroundColor: "#F2F4F7", alignItems: "center", justifyContent: "center" }, rankText: { color: "#667085", fontSize: 10, fontWeight: "900" }, candidateName: { color: "#101828", fontSize: 13, fontWeight: "900" }, candidateWhy: { color: "#667085", fontSize: 10, lineHeight: 15, marginTop: 2 }, score: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF4EF", alignItems: "center", justifyContent: "center" }, scoreText: { color: "#0A4A35", fontWeight: "900" }, resultNote: { color: "#667085", fontSize: 10, lineHeight: 15, marginTop: 10 },
  goodCard: { backgroundColor: "#EAF4EF", borderColor: "#B7D7C9", borderWidth: 1, borderRadius: 17, padding: 16, marginBottom: 12 }, goodEyebrow: { color: "#0A4A35", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, goodTitle: { color: "#101828", fontSize: 17, fontWeight: "900", marginTop: 5 }, goodText: { color: "#475467", fontSize: 12, lineHeight: 18, marginTop: 5 },
  shiftRiskCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 14, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 10 }, openShiftTitle: { color: "#101828", fontWeight: "900", fontSize: 14 }, openShiftMeta: { color: "#667085", fontSize: 11, marginTop: 4 }, urgencyBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "#F2F4F7" }, urgencyBadgeHot: { backgroundColor: "#FEE4E2" }, urgencyText: { color: "#B42318", fontSize: 9, fontWeight: "900" },
  secondaryButton: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, secondaryButtonText: { color: "#0A4A35", fontSize: 11, fontWeight: "900" }, applicationsButton: { backgroundColor: "#0A4A35", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 10 }, applicationsText: { color: "#FFFFFF", fontWeight: "900" },
  guardrailCard: { backgroundColor: "#FFF8E7", borderColor: "#F5D78E", borderWidth: 1, borderRadius: 16, padding: 15, marginTop: 20 }, guardrailEyebrow: { color: "#8A5A00", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 }, guardrailTitle: { color: "#5E430D", fontSize: 16, fontWeight: "900", marginTop: 5 }, guardrailBody: { color: "#7A5A20", fontSize: 12, lineHeight: 18, marginTop: 5 },
  errorCard: { backgroundColor: "#FEE4E2", borderRadius: 16, padding: 15, marginBottom: 16 }, errorTitle: { color: "#B42318", fontWeight: "900" }, errorText: { color: "#7A271A", fontSize: 12, lineHeight: 18, marginTop: 4 }, retry: { alignSelf: "flex-start", backgroundColor: "#B42318", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, marginTop: 10 }, retryText: { color: "white", fontWeight: "900", fontSize: 11 }, emptyText: { color: "#667085", fontSize: 12, lineHeight: 18, paddingVertical: 12 },
});
