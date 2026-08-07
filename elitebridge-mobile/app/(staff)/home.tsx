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
  fetchMyApplications,
  fetchOpenShifts,
  sharedApiConfigured,
  type CaregiverApplication,
  type CaregiverShift,
} from "@/lib/shared-api";

const seedShifts: CaregiverShift[] = [
  {
    id: 9001,
    employerId: 1,
    employerName: "Sunrise Senior Living",
    title: "Personal Care · Mary Thompson",
    serviceType: "Personal Care",
    caregiverType: "Caregiver",
    careRecipientName: "Mary Thompson",
    startTime: new Date(Date.now() + 86_400_000).toISOString(),
    endTime: new Date(Date.now() + 86_400_000 + 8 * 3_600_000).toISOString(),
    location: { type: "client_home", address: "18 Riverside St", city: "Lowell", state: "MA", zipCode: "01852" },
    hourlyRate: 18,
    requirements: [],
    responsibilities: "Personal care and meal preparation.",
    urgency: "standard",
    status: "open",
  },
  {
    id: 9002,
    employerId: 1,
    employerName: "Golden Years Community",
    title: "Companionship · Robert Davis",
    serviceType: "Companionship",
    caregiverType: "Companion",
    careRecipientName: "Robert Davis",
    startTime: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    endTime: new Date(Date.now() + 2 * 86_400_000 + 5 * 3_600_000).toISOString(),
    location: { type: "client_home", address: "42 Lakeview Ave", city: "Dracut", state: "MA", zipCode: "01826" },
    hourlyRate: 20,
    requirements: [],
    responsibilities: "Companionship and transportation support.",
    urgency: "urgent",
    status: "open",
  },
];

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
  return "#B54708";
}

export default function StaffHome() {
  const colors = useColors();
  const [expandedSection, setExpandedSection] = useState<string | null>("shifts");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableShifts, setAvailableShifts] = useState<CaregiverShift[]>(seedShifts);
  const [applications, setApplications] = useState<CaregiverApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState(sharedApiConfigured ? "Connecting to agency shift feed…" : "Local TestFlight demo feed");

  const refreshFeed = async () => {
    if (!sharedApiConfigured) return;
    try {
      setRefreshing(true);
      const [shifts, myApplications] = await Promise.all([fetchOpenShifts(), fetchMyApplications()]);
      setAvailableShifts(shifts);
      setApplications(myApplications);
      setSyncMessage("Live agency shift feed");
    } catch (error) {
      setSyncMessage(error instanceof Error ? `Sync issue: ${error.message}` : "Shared feed unavailable");
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
  const stats = {
    appliedShifts: applications.length || availableShifts.filter((item) => item.applicationStatus).length,
    completedShifts: 12,
    totalEarnings: 1440,
    upcomingShifts: approvedApplications.length,
  };

  const apply = async (shift: CaregiverShift) => {
    if (shift.applicationStatus) return;
    try {
      setApplyingId(shift.id);
      if (sharedApiConfigured) {
        await applyToShift(shift.id, "Available and interested in this assignment.");
        await refreshFeed();
      } else {
        setAvailableShifts((current) => current.map((item) => item.id === shift.id ? { ...item, applicationStatus: "pending" } : item));
      }
      Alert.alert("Application sent", sharedApiConfigured ? "The agency can now review your application in Elite Bridge Employer." : "Demo application recorded on this device.");
    } catch (error) {
      Alert.alert("Could not apply", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setApplyingId(null);
    }
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
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>Dashboard</Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Welcome back, Sarah</Text>
        <View style={{ alignSelf: "flex-start", marginTop: 9, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: sharedApiConfigured ? "#EAF7EF" : "#F2F4F7" }}>
          <Text style={{ color: "#1B5E3F", fontSize: 11, fontWeight: "800" }}>{syncMessage}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 18 }}>{renderStatCard("Applied", stats.appliedShifts, "#1B5E3F")}{renderStatCard("Completed", stats.completedShifts, "#3498DB")}</View>
      <View style={{ flexDirection: "row", marginBottom: 20 }}>{renderStatCard("Earnings", `$${stats.totalEarnings}`, "#27AE60")}{renderStatCard("Upcoming", stats.upcomingShifts, "#E74C3C")}</View>

      <TouchableOpacity onPress={() => setExpandedSection("shifts")} style={{ backgroundColor: "#1B5E3F", borderRadius: 12, padding: 16, marginBottom: 20, alignItems: "center" }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>🔔 Browse Available Shifts</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Search shifts by agency, client or location..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 12, fontSize: 14, color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginBottom: 20 }}
        placeholderTextColor={colors.muted}
      />

      {renderSectionHeader("Available Shifts", "📅", "#FF6B6B", "shifts")}
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
                  onPress={() => apply(shift)}
                  style={{ backgroundColor: shift.applicationStatus ? "#D0D5DD" : "#1B5E3F", borderRadius: 7, paddingHorizontal: 14, paddingVertical: 8, minWidth: 92, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: shift.applicationStatus ? "#475467" : "#fff" }}>{applyingId === shift.id ? "Sending…" : shift.applicationStatus ? "Applied" : "Apply Now"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {filteredShifts.length === 0 && !refreshing ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>No matching open shifts right now.</Text> : null}
        </View>
      )}

      {renderSectionHeader("My Applications", "📋", "#4ECDC4", "applications")}
      {expandedSection === "applications" && (
        <View style={{ marginBottom: 20 }}>
          {(applications.length ? applications : availableShifts.filter((item) => item.applicationStatus).map((shift) => ({ id: shift.id, status: shift.applicationStatus || "pending", appliedAt: new Date().toISOString(), shift } as CaregiverApplication))).map((app) => (
            <View key={app.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: applicationColor(app.status) }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{app.shift.employerName || "Elite Bridge Agency"}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{app.shift.serviceType}{app.shift.careRecipientName ? ` · ${app.shift.careRecipientName}` : ""}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}><Text style={{ fontSize: 12, color: colors.muted }}>{formatDateTime(app.shift.startTime, app.shift.endTime)}</Text><Text style={{ color: applicationColor(app.status), fontSize: 12, fontWeight: "900", textTransform: "capitalize" }}>{app.status}</Text></View>
            </View>
          ))}
          {applications.length === 0 && !availableShifts.some((item) => item.applicationStatus) ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>Applications you send will appear here.</Text> : null}
        </View>
      )}

      {renderSectionHeader("Upcoming Shifts", "⏰", "#45B7D1", "upcoming")}
      {expandedSection === "upcoming" && (
        <View style={{ marginBottom: 20 }}>
          {approvedApplications.map((app) => (
            <View key={app.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#E74C3C" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{app.shift.employerName || "Elite Bridge Agency"}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{app.shift.serviceType} · {formatDateTime(app.shift.startTime, app.shift.endTime)}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1B5E3F", marginTop: 8 }}>${app.shift.hourlyRate}/hr · Approved</Text>
            </View>
          ))}
          {approvedApplications.length === 0 ? <Text style={{ color: colors.muted, textAlign: "center", padding: 18 }}>Approved assignments will appear here automatically.</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}
