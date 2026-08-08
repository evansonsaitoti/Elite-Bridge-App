import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  applyToShift,
  callOutOfShift,
  fetchMyApplications,
  fetchOpenShifts,
  fetchRescueOffers,
  respondToRescueOffer,
  sharedApiConfigured,
  type CalloutReason,
  type CaregiverApplication,
  type CaregiverShift,
  type RescueOffer,
} from "@/lib/shared-api";

function formatDateTime(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Scheduled shift";
  const date = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime} – ${endTime}`;
}

function applicationColor(status?: string) {
  if (status === "approved") return "#218739";
  if (status === "rejected") return "#B42318";
  if (status === "callout") return "#7F56D9";
  return "#B54708";
}

export default function StaffHome() {
  const colors = useColors();
  const [expandedSection, setExpandedSection] = useState<string | null>("shifts");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableShifts, setAvailableShifts] = useState<CaregiverShift[]>([]);
  const [applications, setApplications] = useState<CaregiverApplication[]>([]);
  const [offers, setOffers] = useState<RescueOffer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [respondingOfferId, setRespondingOfferId] = useState<number | null>(null);
  const [callingOutShiftId, setCallingOutShiftId] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState(sharedApiConfigured ? "Connecting to secure agency sync…" : "Secure local preview");

  const refreshFeed = async () => {
    if (!sharedApiConfigured) return;
    try {
      setRefreshing(true);
      const [shifts, myApplications, priorityOffers] = await Promise.all([
        fetchOpenShifts(),
        fetchMyApplications(),
        fetchRescueOffers(),
      ]);
      setAvailableShifts(shifts);
      setApplications(myApplications);
      setOffers(priorityOffers);
      setSyncMessage("Live agency sync");
    } catch (error) {
      setSyncMessage(error instanceof Error ? `Sync issue: ${error.message}` : "Shared service unavailable");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshFeed();
  }, []);

  const filteredShifts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableShifts;
    return availableShifts.filter((shift) =>
      [shift.title, shift.serviceType, shift.employerName, shift.careRecipientName, shift.location.city, shift.location.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [availableShifts, searchQuery]);

  const approvedApplications = applications.filter((item) => item.status === "approved");
  const openOffers = offers.filter((item) => item.status === "offered");

  const apply = async (shift: CaregiverShift) => {
    if (shift.applicationStatus) return;
    if (!sharedApiConfigured) {
      Alert.alert("Agency sync required", "Connect to the shared agency service before applying to a shift.");
      return;
    }
    try {
      setApplyingId(shift.id);
      await applyToShift(shift.id, "Available and interested in this assignment.");
      await refreshFeed();
      Alert.alert("Application sent", "The agency can now review your application in Elite Bridge Employer.");
    } catch (error) {
      Alert.alert("Could not apply", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setApplyingId(null);
    }
  };

  const respondToOffer = async (offer: RescueOffer, status: "accepted" | "declined") => {
    if (!sharedApiConfigured) return;
    try {
      setRespondingOfferId(offer.id);
      const result = await respondToRescueOffer(offer.id, status);
      await refreshFeed();
      Alert.alert(
        status === "accepted" ? "Priority offer accepted" : "Offer declined",
        status === "accepted"
          ? `${result.nextStep}. The agency still makes the final assignment decision.`
          : "The agency has been updated.",
      );
    } catch (error) {
      Alert.alert("Could not update offer", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRespondingOfferId(null);
    }
  };

  const submitCallout = async (application: CaregiverApplication, reason: CalloutReason) => {
    if (!sharedApiConfigured) return;
    try {
      setCallingOutShiftId(application.shift.id);
      await callOutOfShift(application.shift.id, reason);
      await refreshFeed();
      Alert.alert(
        "Call-out reported",
        "The agency was alerted and the shift was reopened as urgent. Coverage Copilot can now begin replacement outreach.",
      );
    } catch (error) {
      Alert.alert("Could not report call-out", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setCallingOutShiftId(null);
    }
  };

  const confirmCallout = (application: CaregiverApplication) => {
    Alert.alert(
      "Report that you cannot work this shift?",
      "This immediately alerts the agency and reopens the assignment for urgent coverage. Choose the reason that best describes the call-out.",
      [
        { text: "Illness", onPress: () => void submitCallout(application, "illness") },
        { text: "Family emergency", onPress: () => void submitCallout(application, "family_emergency") },
        { text: "Transportation", onPress: () => void submitCallout(application, "transportation") },
        { text: "Other", onPress: () => void submitCallout(application, "other") },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const toggleSection = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  const renderStatCard = (label: string, value: string | number, color: string) => (
    <View style={{ flex: 1, backgroundColor: color, borderRadius: 12, padding: 16, marginHorizontal: 6, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: "#fff", textAlign: "center" }}>{label}</Text>
    </View>
  );

  const renderSectionHeader = (title: string, icon: string, color: string, sectionId: string) => (
    <TouchableOpacity onPress={() => toggleSection(sectionId)} style={{ backgroundColor: color, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>{icon} {title}</Text>
      <Text style={{ fontSize: 18, color: "#fff" }}>{expandedSection === sectionId ? "▼" : "▶"}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFeed} />}
    >
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>My Work</Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Available work, applications and assigned shifts in one place.</Text>
        <View style={{ alignSelf: "flex-start", marginTop: 9, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: sharedApiConfigured ? "#EAF7EF" : "#F2F4F7" }}>
          <Text style={{ color: "#1B5E3F", fontSize: 11, fontWeight: "800" }}>{syncMessage}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        {renderStatCard("Open shifts", availableShifts.length, "#1B5E3F")}
        {renderStatCard("Applications", applications.length, "#3498DB")}
      </View>
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        {renderStatCard("Upcoming", approvedApplications.length, "#27AE60")}
        {renderStatCard("Priority offers", openOffers.length, "#B54708")}
      </View>

      {openOffers.length > 0 ? (
        <View style={{ marginBottom: 20 }}>
          <View style={{ backgroundColor: "#FFF4E5", borderColor: "#FEC84B", borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <Text style={{ color: "#7A2E0E", fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>PRIORITY COVERAGE</Text>
            <Text style={{ color: "#101828", fontSize: 18, fontWeight: "900", marginTop: 5 }}>You have {openOffers.length} urgent shift {openOffers.length === 1 ? "offer" : "offers"}.</Text>
            <Text style={{ color: "#667085", fontSize: 12, lineHeight: 18, marginTop: 5 }}>Elite matched these based on agency coverage needs. Accepting sends your interest to the scheduler; it does not auto-assign you.</Text>
          </View>
          {openOffers.map((offer) => (
            <View key={offer.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: "#F79009" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.foreground }}>{offer.shift.serviceType}{offer.shift.careRecipientName ? ` · ${offer.shift.careRecipientName}` : ""}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{offer.shift.employerName || "Elite Bridge Agency"} · {offer.shift.location.city}, {offer.shift.location.state}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{formatDateTime(offer.shift.startTime, offer.shift.endTime)}</Text>
                </View>
                <View style={{ backgroundColor: "#EAF4EF", borderRadius: 999, minWidth: 48, height: 48, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#0A4A35", fontWeight: "900" }}>{offer.score}</Text></View>
              </View>
              <Text style={{ color: "#475467", fontSize: 12, lineHeight: 18, marginTop: 10 }}>{offer.rationale}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity disabled={respondingOfferId === offer.id} onPress={() => void respondToOffer(offer, "accepted")} style={{ flex: 1, backgroundColor: "#0A4A35", padding: 11, borderRadius: 9, alignItems: "center" }}><Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>{respondingOfferId === offer.id ? "Updating…" : "I'm available"}</Text></TouchableOpacity>
                <TouchableOpacity disabled={respondingOfferId === offer.id} onPress={() => void respondToOffer(offer, "declined")} style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, borderWidth: 1, borderColor: "#D0D5DD" }}><Text style={{ color: "#475467", fontWeight: "800", fontSize: 12 }}>Decline</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <TextInput
        placeholder="Search shifts by agency, client or location..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 12, fontSize: 14, color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}
        placeholderTextColor={colors.muted}
      />

      {renderSectionHeader("Available Shifts", "📅", "#1B5E3F", "shifts")}
      {expandedSection === "shifts" && (
        <View style={{ marginBottom: 20 }}>
          {refreshing && filteredShifts.length === 0 ? <ActivityIndicator color="#1B5E3F" /> : null}
          {filteredShifts.map((shift) => (
            <View key={shift.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: shift.urgency === "urgent" ? "#E74C3C" : "#1B5E3F" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}>{shift.serviceType}{shift.careRecipientName ? ` · ${shift.careRecipientName}` : ""}</Text>
                  <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 2 }}>{shift.employerName || "Elite Bridge Agency"}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>📍 {shift.location.city}, {shift.location.state}</Text>
                </View>
                <View style={{ backgroundColor: "#1B5E3F", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>${shift.hourlyRate}/hr</Text></View>
              </View>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>{formatDateTime(shift.startTime, shift.endTime)}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }} numberOfLines={2}>{shift.responsibilities}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                {shift.urgency === "urgent" ? <Text style={{ color: "#B42318", fontSize: 11, fontWeight: "900" }}>URGENT COVERAGE</Text> : <View />}
                <TouchableOpacity
                  disabled={Boolean(shift.applicationStatus) || applyingId === shift.id}
                  onPress={() => void apply(shift)}
                  style={{ backgroundColor: shift.applicationStatus ? "#D0D5DD" : "#1B5E3F", borderRadius: 7, paddingHorizontal: 14, paddingVertical: 8, minWidth: 92, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: shift.applicationStatus ? "#475467" : "#fff" }}>{applyingId === shift.id ? "Sending…" : shift.applicationStatus ? "Applied" : "Apply Now"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {filteredShifts.length === 0 && !refreshing ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>No matching open shifts right now. Pull down to refresh.</Text> : null}
        </View>
      )}

      {renderSectionHeader("My Applications", "📋", "#4E87D9", "applications")}
      {expandedSection === "applications" && (
        <View style={{ marginBottom: 20 }}>
          {applications.map((app) => (
            <View key={app.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: applicationColor(app.status) }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{app.shift.employerName || "Elite Bridge Agency"}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{app.shift.serviceType}{app.shift.careRecipientName ? ` · ${app.shift.careRecipientName}` : ""}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}><Text style={{ fontSize: 12, color: colors.muted, flex: 1 }}>{formatDateTime(app.shift.startTime, app.shift.endTime)}</Text><Text style={{ color: applicationColor(app.status), fontSize: 12, fontWeight: "900", textTransform: "capitalize" }}>{app.status === "callout" ? "Called out" : app.status}</Text></View>
            </View>
          ))}
          {applications.length === 0 ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>Applications you send will appear here.</Text> : null}
        </View>
      )}

      {renderSectionHeader("Upcoming Assignments", "⏰", "#0A4A35", "upcoming")}
      {expandedSection === "upcoming" && (
        <View style={{ marginBottom: 20 }}>
          {approvedApplications.map((app) => (
            <View key={app.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#218739" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{app.shift.employerName || "Elite Bridge Agency"}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{app.shift.serviceType}{app.shift.careRecipientName ? ` · ${app.shift.careRecipientName}` : ""}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 7 }}>{formatDateTime(app.shift.startTime, app.shift.endTime)}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1B5E3F", marginTop: 8 }}>${app.shift.hourlyRate}/hr · Confirmed</Text>
              <TouchableOpacity
                disabled={callingOutShiftId === app.shift.id}
                onPress={() => confirmCallout(app)}
                style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 }}
              >
                <Text style={{ color: "#B42318", fontSize: 12, fontWeight: "900" }}>{callingOutShiftId === app.shift.id ? "Reporting…" : "I can't work this shift"}</Text>
              </TouchableOpacity>
            </View>
          ))}
          {approvedApplications.length === 0 ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>Approved assignments will appear here automatically.</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}
