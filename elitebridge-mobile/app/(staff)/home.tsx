import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * Staff Home Dashboard
 * Shows available shifts, applications, earnings, and quick actions
 */
export default function StaffHome() {
  const colors = useColors();
  const [expandedSection, setExpandedSection] = useState<string | null>("shifts");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const stats = {
    appliedShifts: 5,
    completedShifts: 12,
    totalEarnings: 1440,
    upcomingShifts: 2,
  };

  const availableShifts = [
    {
      id: 1,
      title: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living",
      location: "Maple Grove, MN",
      date: "Tomorrow",
      time: "8:00 AM - 4:00 PM",
      pay: "$18/hr",
      status: "Open",
    },
    {
      id: 2,
      title: "Activities Coordinator",
      facility: "Golden Years Community",
      location: "Minneapolis, MN",
      date: "Tomorrow",
      time: "10:00 AM - 6:00 PM",
      pay: "$16/hr",
      status: "Open",
    },
    {
      id: 3,
      title: "Dining Services Assistant",
      facility: "Meadowbrook Assisted Living",
      location: "St Paul, MN",
      date: "Day After Tomorrow",
      time: "9:00 AM - 5:00 PM",
      pay: "$17/hr",
      status: "Open",
    },
  ];

  const applications = [
    {
      id: 1,
      facility: "Sunrise Senior Living",
      position: "Caregiver",
      appliedDate: "2 days ago",
      status: "Pending",
      statusColor: "#F7DC6F",
    },
    {
      id: 2,
      facility: "Golden Years Community",
      position: "Activities Coordinator",
      appliedDate: "1 week ago",
      status: "Approved",
      statusColor: "#52BE80",
    },
    {
      id: 3,
      facility: "Meadowbrook Assisted Living",
      position: "Dining Services",
      appliedDate: "3 days ago",
      status: "Under Review",
      statusColor: "#3498DB",
    },
  ];

  const upcomingShifts = [
    {
      id: 1,
      facility: "Sunrise Senior Living",
      date: "Tomorrow",
      time: "8:00 AM - 4:00 PM",
      pay: "$144",
    },
    {
      id: 2,
      facility: "Golden Years Community",
      date: "Day After Tomorrow",
      time: "10:00 AM - 6:00 PM",
      pay: "$128",
    },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderStatCard = (label: string, value: string | number, color: string) => (
    <View
      style={{
        flex: 1,
        backgroundColor: color,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 6,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: "#fff", textAlign: "center" }}>{label}</Text>
    </View>
  );

  const renderSectionHeader = (title: string, icon: string, color: string, sectionId: string) => (
    <TouchableOpacity
      onPress={() => toggleSection(sectionId)}
      style={{
        backgroundColor: color,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
        {icon} {title}
      </Text>
      <Text style={{ fontSize: 18, color: "#fff" }}>
        {expandedSection === sectionId ? "▼" : "▶"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>
          Dashboard
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Welcome back, Sarah</Text>
      </View>

      {/* Stats Cards */}
      <View style={{ flexDirection: "row", marginBottom: 24, flexWrap: "wrap" }}>
        {renderStatCard("Applied", stats.appliedShifts, "#1B5E3F")}
        {renderStatCard("Completed", stats.completedShifts, "#3498DB")}
      </View>
      <View style={{ flexDirection: "row", marginBottom: 24, flexWrap: "wrap" }}>
        {renderStatCard("Earnings", `$${stats.totalEarnings}`, "#27AE60")}
        {renderStatCard("Upcoming", stats.upcomingShifts, "#E74C3C")}
      </View>

      {/* Quick Action Button */}
      <TouchableOpacity
        style={{
          backgroundColor: "#1B5E3F",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
          🔔 Browse Available Shifts
        </Text>
      </TouchableOpacity>

      {/* Search Bar */}
      <View style={{ marginBottom: 20 }}>
        <TextInput
          placeholder="Search shifts by facility or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            color: colors.foreground,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Available Shifts Section */}
      {renderSectionHeader("Available Shifts", "📅", "#FF6B6B", "shifts")}
      {expandedSection === "shifts" && (
        <View style={{ marginBottom: 20 }}>
          {availableShifts.map((shift) => (
            <TouchableOpacity
              key={shift.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: "#1B5E3F",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                    {shift.title}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 2 }}>
                    {shift.facility}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    📍 {shift.location}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "#1B5E3F",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
                    {shift.pay}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {shift.date} • {shift.time}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#1B5E3F",
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                    Apply Now
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* My Applications Section */}
      {renderSectionHeader("My Applications", "📋", "#4ECDC4", "applications")}
      {expandedSection === "applications" && (
        <View style={{ marginBottom: 20 }}>
          {applications.map((app) => (
            <View
              key={app.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: app.statusColor,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                    {app.facility}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
                    {app.position}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    Applied {app.appliedDate}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: app.statusColor,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                    {app.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Shifts Section */}
      {renderSectionHeader("Upcoming Shifts", "⏰", "#45B7D1", "upcoming")}
      {expandedSection === "upcoming" && (
        <View style={{ marginBottom: 20 }}>
          {upcomingShifts.map((shift) => (
            <View
              key={shift.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: "#E74C3C",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                    {shift.facility}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.muted }}>
                    {shift.date} • {shift.time}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1B5E3F" }}>
                  {shift.pay}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "#1B5E3F",
                    borderRadius: 6,
                    paddingVertical: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                    Clock In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: colors.border,
                    borderRadius: 6,
                    paddingVertical: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
                    Swap
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Links Section */}
      {renderSectionHeader("Quick Links", "⚙️", "#F7DC6F", "links")}
      {expandedSection === "links" && (
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
              💰 View Earnings
            </Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
              📅 My Availability
            </Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
              👤 My Profile
            </Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#E74C3C" }}>
              🚪 Logout
            </Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
