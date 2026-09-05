import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  defaultCaregiverPreferences,
  getCaregiverPreferences,
  type CaregiverPreferences,
} from "@/lib/caregiver-preferences";
import {
  applyToShift,
  callOutOfShift,
  claimMatchedShift,
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

const AVAILABILITY_KEY = "elitebridge-caregiver-available-now-v1";

function formatDateTime(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Scheduled shift";
  const date = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime} - ${endTime}`;
}

function shiftHours(shift: CaregiverShift) {
  const start = new Date(shift.startTime).getTime();
  const end = new Date(shift.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "Shift";
  const hours = (end - start) / 36e5;
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} hr`;
}

function applicationColor(status?: string) {
  if (status === "approved") return "#218739";
  if (status === "rejected") return "#B42318";
  if (status === "callout") return "#7F56D9";
  return "#B54708";
}

function matchReasons(shift: CaregiverShift, preferences: CaregiverPreferences) {
  const reasons: string[] = [];
  if (preferences.instantOffers && shift.assignmentMode === "instant") reasons.push("Instant claim");
  if (preferences.preferredServices.includes(shift.serviceType)) reasons.push("Preferred service");
  if (shift.urgency === "urgent") reasons.push("Urgent coverage");
  if (preferences.availability.length) reasons.push(preferences.availability[0]);
  if (!reasons.length) reasons.push("Open care shift");
  return reasons.slice(0, 3);
}

function opportunityScore(shift: CaregiverShift, preferences: CaregiverPreferences) {
  let score = 72;
  if (shift.urgency === "urgent") score += 10;
  if (shift.assignmentMode === "instant") score += 8;
  if (preferences.preferredServices.includes(shift.serviceType)) score += 7;
  if (preferences.instantOffers) score += 5;
  return Math.min(score, 99);
}

export default function StaffHome() {
  const colors = useColors();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [availableShifts, setAvailableShifts] = useState<CaregiverShift[]>([]);
  const [applications, setApplications] = useState<CaregiverApplication[]>([]);
  const [offers, setOffers] = useState<RescueOffer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [respondingOfferId, setRespondingOfferId] = useState<number | null>(null);
  const [callingOutShiftId, setCallingOutShiftId] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState(sharedApiConfigured ? "Live agency sync starting" : "Secure device data");
  const [preferences, setPreferences] = useState<CaregiverPreferences>(defaultCaregiverPreferences);

  const refreshFeed = async () => {
    const [savedPreferences, savedAvailability] = await Promise.all([
      getCaregiverPreferences(),
      AsyncStorage.getItem(AVAILABILITY_KEY),
    ]);
    setPreferences(savedPreferences);
    setAvailableNow(savedAvailability === "true");

    if (!sharedApiConfigured) {
      setSyncMessage("Secure agency service is not configured");
      setRefreshing(false);
      return;
    }

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
    const ranked = [...availableShifts].sort((left, right) => {
      if (left.urgency !== right.urgency) return left.urgency === "urgent" ? -1 : 1;
      return opportunityScore(right, preferences) - opportunityScore(left, preferences);
    });
    if (!query) return ranked;
    return ranked.filter((shift) =>
      [shift.title, shift.serviceType, shift.employerName, shift.careRecipientName, shift.location.city, shift.location.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [availableShifts, preferences, searchQuery]);

  const approvedApplications = applications.filter((item) => item.status === "approved");
  const openOffers = offers.filter((item) => item.status === "offered");
  const urgentShifts = availableShifts.filter((shift) => shift.urgency === "urgent");
  const instantShifts = availableShifts.filter((shift) => shift.assignmentMode === "instant");
  const nextAssignment = approvedApplications[0];
  const matchStrength = Math.min(
    98,
    68 + preferences.availability.length * 4 + preferences.preferredServices.length * 3 + (preferences.instantOffers ? 8 : 0),
  );

  const setAvailability = async (value: boolean) => {
    setAvailableNow(value);
    await AsyncStorage.setItem(AVAILABILITY_KEY, value ? "true" : "false");
  };

  const apply = async (shift: CaregiverShift) => {
    if (shift.applicationStatus) return;
    if (!sharedApiConfigured) {
      Alert.alert("Agency sync required", "Connect to the shared agency service before applying to a shift.");
      return;
    }
    try {
      setApplyingId(shift.id);
      if (shift.assignmentMode === "instant") await claimMatchedShift(shift.id);
      else await applyToShift(shift.id, "Available and interested in this assignment.");
      await refreshFeed();
      Alert.alert(
        shift.assignmentMode === "instant" ? "Shift claimed" : "Application sent",
        shift.assignmentMode === "instant"
          ? "You are assigned. The employer has been notified immediately."
          : "The agency can now review your application in Elite Bridge Employer.",
      );
    } catch (error) {
      Alert.alert(
        shift.assignmentMode === "instant" ? "Could not claim shift" : "Could not apply",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setApplyingId(null);
    }
  };

  const respondToOffer = async (offer: RescueOffer, status: "accepted" | "declined") => {
    if (!sharedApiConfigured) {
      Alert.alert("Agency sync required", "Connect to the shared agency service before responding to an offer.");
      return;
    }
    try {
      setRespondingOfferId(offer.id);
      const result = await respondToRescueOffer(offer.id, status);
      await refreshFeed();
      Alert.alert(
        status === "accepted" ? "Priority offer accepted" : "Offer declined",
        status === "accepted" ? `${result.nextStep}. The agency still makes the final assignment decision.` : "The agency has been updated.",
      );
    } catch (error) {
      Alert.alert("Could not update offer", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRespondingOfferId(null);
    }
  };

  const submitCallout = async (application: CaregiverApplication, reason: CalloutReason) => {
    if (!sharedApiConfigured) {
      Alert.alert("Agency sync required", "Connect to the shared agency service before reporting a call-out.");
      return;
    }
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
      "This alerts the agency and reopens the assignment for urgent coverage. Choose the reason that best describes the call-out.",
      [
        { text: "Illness", onPress: () => void submitCallout(application, "illness") },
        { text: "Family emergency", onPress: () => void submitCallout(application, "family_emergency") },
        { text: "Transportation", onPress: () => void submitCallout(application, "transportation") },
        { text: "Other", onPress: () => void submitCallout(application, "other") },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const renderMetric = (label: string, value: string | number, accent: string) => (
    <View style={{ flex: 1, borderRadius: 16, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: accent, fontSize: 22, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: 3 }}>{label}</Text>
    </View>
  );

  const renderTool = (
    title: string,
    detail: string,
    icon: "clock.fill" | "sparkles" | "calendar" | "message.fill",
    route: string,
    tint = "#0A4A35",
  ) => (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => router.push(route as never)}
      style={{ width: "48%", borderRadius: 18, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#EAF4EF", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <IconSymbol name={icon} size={22} color={tint} />
      </View>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{detail}</Text>
    </TouchableOpacity>
  );

  const renderShiftCard = (shift: CaregiverShift) => {
    const isInstant = shift.assignmentMode === "instant";
    const isUrgent = shift.urgency === "urgent";
    const reasons = matchReasons(shift, preferences);
    const score = opportunityScore(shift, preferences);
    const disabled = Boolean(shift.applicationStatus) || applyingId === shift.id;
    const buttonText = applyingId === shift.id
      ? "Sending"
      : shift.applicationStatus
        ? shift.applicationStatus === "approved" ? "Assigned" : "Applied"
        : isInstant ? "Claim now" : "Apply";

    return (
      <View key={shift.id} style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: isUrgent ? "#FEC84B" : colors.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              <Text style={{ backgroundColor: isUrgent ? "#FFF4E5" : "#EAF4EF", color: isUrgent ? "#B54708" : "#0A4A35", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "900" }}>
                {isUrgent ? "URGENT" : "MATCHED"}
              </Text>
              <Text style={{ backgroundColor: "#F2F4F7", color: "#475467", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "900" }}>
                {isInstant ? "INSTANT CLAIM" : "REVIEW FIRST"}
              </Text>
            </View>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", lineHeight: 24 }}>
              {shift.serviceType}{shift.careRecipientName ? ` for ${shift.careRecipientName}` : ""}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{shift.employerName || "Elite Bridge Agency"}</Text>
          </View>
          <View style={{ minWidth: 66, borderRadius: 18, padding: 10, backgroundColor: "#0A4A35", alignItems: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900" }}>{score}</Text>
            <Text style={{ color: "#BFE4D4", fontSize: 9, fontWeight: "800" }}>FIT</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <View style={{ flex: 1, borderRadius: 14, backgroundColor: "#F8FAF9", padding: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>WHEN</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 17, fontWeight: "800", marginTop: 3 }}>{formatDateTime(shift.startTime, shift.endTime)}</Text>
          </View>
          <View style={{ width: 86, borderRadius: 14, backgroundColor: "#F8FAF9", padding: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>PAY</Text>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900", marginTop: 3 }}>${Number(shift.hourlyRate).toFixed(0)}/hr</Text>
            <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{shiftHours(shift)}</Text>
          </View>
        </View>

        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>{shift.location.city}, {shift.location.state}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }} numberOfLines={2}>{shift.responsibilities}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
          {reasons.map((reason) => (
            <Text key={reason} style={{ color: "#0A4A35", backgroundColor: "#EAF4EF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: "900" }}>
              {reason}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          disabled={disabled}
          onPress={() => void apply(shift)}
          style={{ marginTop: 14, minHeight: 48, borderRadius: 14, backgroundColor: disabled ? "#D0D5DD" : isUrgent ? "#B54708" : "#0A4A35", alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: disabled ? "#475467" : "#FFFFFF", fontSize: 15, fontWeight: "900" }}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFeed} />}
    >
      <View style={{ borderRadius: 24, backgroundColor: "#0A4A35", padding: 18, marginBottom: 16 }}>
        <Text style={{ color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>ELITE BRIDGE NOW</Text>
        <Text style={{ color: "#FFFFFF", fontSize: 29, fontWeight: "900", lineHeight: 34, marginTop: 8 }}>Ready for care coverage near you?</Text>
        <Text style={{ color: "#D9E9E2", fontSize: 13, lineHeight: 19, marginTop: 8 }}>Go available, see urgent shifts, claim matched work and keep every visit payroll-ready.</Text>
        <View style={{ marginTop: 16, borderRadius: 18, backgroundColor: "#FFFFFF", padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#101828", fontSize: 16, fontWeight: "900" }}>{availableNow ? "Available for short-notice shifts" : "Not marked available now"}</Text>
            <Text style={{ color: "#667085", fontSize: 12, lineHeight: 17, marginTop: 3 }}>Use this as your live readiness signal for urgent care requests.</Text>
          </View>
          <Switch value={availableNow} onValueChange={(value) => void setAvailability(value)} trackColor={{ false: "#D0D5DD", true: "#BFE4D4" }} thumbColor={availableNow ? "#0A4A35" : "#FFFFFF"} />
        </View>
      </View>

      <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: sharedApiConfigured ? "#EAF7EF" : "#F2F4F7", marginBottom: 14 }}>
        <Text style={{ color: "#1B5E3F", fontSize: 11, fontWeight: "800" }}>{syncMessage}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        {renderMetric("Urgent", urgentShifts.length, "#B54708")}
        {renderMetric("Instant", instantShifts.length, "#0A4A35")}
        {renderMetric("Assigned", approvedApplications.length, "#218739")}
      </View>

      {nextAssignment ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.push("/(staff)/clock")}
          style={{ borderRadius: 20, padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
        >
          <Text style={{ color: "#7A2E0E", fontSize: 10, fontWeight: "900", letterSpacing: 1 }}>NEXT VISIT</Text>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900", marginTop: 6 }}>{nextAssignment.shift.serviceType}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{formatDateTime(nextAssignment.shift.startTime, nextAssignment.shift.endTime)}</Text>
          <Text style={{ color: "#0A4A35", fontSize: 12, fontWeight: "900", marginTop: 8 }}>Open time clock</Text>
        </TouchableOpacity>
      ) : null}

      {openOffers.length > 0 ? (
        <View style={{ marginBottom: 16 }}>
          <View style={{ backgroundColor: "#FFF4E5", borderColor: "#FEC84B", borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 }}>
            <Text style={{ color: "#7A2E0E", fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>PRIORITY COVERAGE</Text>
            <Text style={{ color: "#101828", fontSize: 18, fontWeight: "900", marginTop: 5 }}>Urgent offer waiting</Text>
            <Text style={{ color: "#667085", fontSize: 12, lineHeight: 18, marginTop: 5 }}>Respond quickly so the scheduler can keep care covered.</Text>
          </View>
          {openOffers.map((offer) => (
            <View key={offer.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "#FEC84B" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: colors.foreground }}>{offer.shift.serviceType}{offer.shift.careRecipientName ? ` for ${offer.shift.careRecipientName}` : ""}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{offer.shift.employerName || "Elite Bridge Agency"} · {offer.shift.location.city}, {offer.shift.location.state}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{formatDateTime(offer.shift.startTime, offer.shift.endTime)}</Text>
                </View>
                <View style={{ backgroundColor: "#EAF4EF", borderRadius: 999, minWidth: 48, height: 48, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#0A4A35", fontWeight: "900" }}>{offer.score}</Text></View>
              </View>
              <Text style={{ color: "#475467", fontSize: 12, lineHeight: 18, marginTop: 10 }}>{offer.rationale}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity disabled={respondingOfferId === offer.id} onPress={() => void respondToOffer(offer, "accepted")} style={{ flex: 1, backgroundColor: "#0A4A35", padding: 12, borderRadius: 12, alignItems: "center" }}><Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>{respondingOfferId === offer.id ? "Updating" : "I am available"}</Text></TouchableOpacity>
                <TouchableOpacity disabled={respondingOfferId === offer.id} onPress={() => void respondToOffer(offer, "declined")} style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#D0D5DD" }}><Text style={{ color: "#475467", fontWeight: "800", fontSize: 12 }}>Decline</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <TextInput
        placeholder="Search by care type, agency or location"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 14, color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
        placeholderTextColor={colors.muted}
      />

      <View style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
          <View>
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "900" }}>Live shift feed</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Urgent and best-fit work appears first.</Text>
          </View>
          <Text style={{ color: "#0A4A35", fontSize: 12, fontWeight: "900" }}>{matchStrength}% profile</Text>
        </View>
        {refreshing && filteredShifts.length === 0 ? <ActivityIndicator color="#1B5E3F" /> : null}
        {filteredShifts.map(renderShiftCard)}
        {filteredShifts.length === 0 && !refreshing ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>No matching open shifts right now. Pull down to refresh.</Text> : null}
      </View>

      <View style={{ marginBottom: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "900", marginBottom: 10 }}>Workday tools</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {renderTool("Time clock", "Clock in, breaks, notes", "clock.fill", "/(staff)/clock")}
          {renderTool("Care Match", "Skills and availability", "sparkles", "/(staff)/match", "#B54708")}
          {renderTool("Timesheets", "Review approved hours", "calendar", "/(staff)/earnings", "#218739")}
          {renderTool("Messages", "Shift and agency updates", "message.fill", "/(staff)/chat", "#4E87D9")}
        </View>
      </View>

      <View style={{ marginBottom: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "900", marginBottom: 10 }}>Applications</Text>
        {applications.slice(0, 4).map((app) => (
          <View key={app.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: applicationColor(app.status) }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: colors.foreground }}>{app.shift.employerName || "Elite Bridge Agency"}</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{app.shift.serviceType}{app.shift.careRecipientName ? ` for ${app.shift.careRecipientName}` : ""}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: colors.muted, flex: 1 }}>{formatDateTime(app.shift.startTime, app.shift.endTime)}</Text>
              <Text style={{ color: applicationColor(app.status), fontSize: 12, fontWeight: "900", textTransform: "capitalize" }}>{app.status === "callout" ? "Called out" : app.status}</Text>
            </View>
            {app.status === "approved" ? (
              <TouchableOpacity
                disabled={callingOutShiftId === app.shift.id}
                onPress={() => confirmCallout(app)}
                style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 }}
              >
                <Text style={{ color: "#B42318", fontSize: 12, fontWeight: "900" }}>{callingOutShiftId === app.shift.id ? "Reporting" : "I cannot work this shift"}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        {applications.length === 0 ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>Applications and claimed shifts will appear here.</Text> : null}
      </View>

      <View style={{ borderRadius: 20, padding: 16, backgroundColor: "#F8F4EA", borderWidth: 1, borderColor: "#EBCB8B" }}>
        <Text style={{ color: "#8A5A00", fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>CARE INDUSTRY DIFFERENCE</Text>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", marginTop: 6 }}>Fast coverage still needs trust.</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>Elite Bridge highlights credentials, care type, location, timing and assignment rules before a caregiver accepts.</Text>
      </View>
    </ScrollView>
  );
}
