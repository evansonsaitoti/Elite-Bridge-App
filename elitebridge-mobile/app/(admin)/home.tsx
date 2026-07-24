import { ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useTimekeeping } from "@/lib/timekeeping-context";

/**
 * Admin Home Screen - Consolidated dashboard with all features
 */
export default function AdminHomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { entries } = useTimekeeping();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);

  // Define colorful section colors
  const sectionColors = {
    shifts: "#FF6B6B",        // Red
    applications: "#4ECDC4",  // Teal
    staff: "#45B7D1",         // Blue
    allocate: "#FFA07A",      // Light Salmon
    notifications: "#98D8C8", // Mint
    settings: "#F7DC6F",      // Yellow
    activity: "#BB8FCE",      // Purple
    timesheets: "#1B5E3F",    // Brand green
  };

  const pendingTimesheets = entries.filter(
    (entry) =>
      entry.status === "completed" || entry.status === "correction_requested",
  ).length;

  const styles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      gap: 16,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    analyticsGrid: {
      flexDirection: "row" as const,
      gap: 12,
      marginBottom: 8,
    },
    analyticsCard: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    analyticsCardAlt: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    analyticsValue: {
      fontSize: 24,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    analyticsValueAlt: {
      color: colors.primary,
    },
    analyticsLabel: {
      fontSize: 11,
      color: "rgba(255,255,255,0.8)",
      marginTop: 4,
      textAlign: "center" as const,
    },
    analyticsLabelAlt: {
      color: colors.muted,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 12,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    sectionContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden" as const,
      marginBottom: 12,
    },
    sectionHeader: (bgColor: string) => ({
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: bgColor,
    }),
    sectionTitle: {
      fontSize: 15,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
    },
    sectionIcon: {
      fontSize: 20,
      color: "#FFFFFF",
    },
    sectionContent: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      backgroundColor: colors.surface,
    },
    actionRow: {
      flexDirection: "row" as const,
      gap: 8,
      marginTop: 8,
    },
    actionRowButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    approveButton: {
      backgroundColor: "#4CAF50",
    },
    rejectButton: {
      backgroundColor: "#F44336",
    },
    allocateButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
    },
    menuItem: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: "rgba(0,0,0,0.02)",
      borderRadius: 8,
    },
    menuItemText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    menuItemArrow: {
      fontSize: 16,
      color: colors.muted,
    },
    itemRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemRowLast: {
      borderBottomWidth: 0,
    },
    itemName: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    itemSubtext: {
      fontSize: 11,
      color: colors.muted,
    },
    itemValue: {
      fontSize: 12,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    statusBadge: (status: string) => ({
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: status === "Open" ? "#4CAF50" : status === "Pending" ? "#FF9800" : "#F44336",
    }),
    statusText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
    },
  };

  const recentActivity = [
    { icon: "📋", text: "Sarah Johnson applied for Caregiver", time: "2 min ago" },
    { icon: "✓", text: "Michael Chen's background check cleared", time: "15 min ago" },
    { icon: "✓", text: "Activities Coordinator shift filled", time: "1 hour ago" },
  ];

  const staffMembers = [
    { id: "1", name: "Sarah Johnson", role: "Caregiver", rating: "4.8⭐", status: "Active" },
    { id: "2", name: "Michael Chen", role: "Activities Coordinator", rating: "4.6⭐", status: "Active" },
    { id: "3", name: "Emily Rodriguez", role: "Dining Services", rating: "4.9⭐", status: "Active" },
  ];

  const shifts = [
    { id: "1", title: "Caregiver - Assisted Living", facility: "Sunrise Senior Living", status: "Open", applicants: 5 },
    { id: "2", title: "Activities Coordinator", facility: "Golden Years", status: "Open", applicants: 3 },
    { id: "3", title: "Dining Services Assistant", facility: "Meadowbrook", status: "Filled", applicants: 1 },
  ];

  const applications = [
    { id: "1", name: "Sarah Johnson", position: "Caregiver", status: "Pending", rating: "4.8⭐" },
    { id: "2", name: "James Wilson", position: "Activities Coordinator", status: "Pending", rating: "4.5⭐" },
    { id: "3", name: "Lisa Chen", position: "Dining Services", status: "Approved", rating: "4.7⭐" },
  ];

  const notifications = [
    { id: "1", icon: "🔔", title: "New Application", message: "Sarah Johnson applied for Caregiver" },
    { id: "2", icon: "✓", title: "Check Complete", message: "Michael Chen's background check cleared" },
    { id: "3", icon: "⏳", title: "Pending Review", message: "James Wilson's check pending" },
  ];

  const handlePostShift = () => {
    Alert.alert("Post New Shift", "Redirect to shift creation form");
  };

  const handleEditShift = (shiftId: string) => {
    Alert.alert("Edit Shift", `Edit shift ${shiftId}`);
  };

  const handleDeleteShift = (shiftId: string) => {
    Alert.alert("Delete Shift", `Confirm delete shift ${shiftId}?`);
  };

  const handleApproveApplication = (appId: string) => {
    Alert.alert("Success", "Application approved!");
  };

  const handleRejectApplication = (appId: string) => {
    Alert.alert("Success", "Application rejected!");
  };

  const handleAllocateShift = (staffId: string) => {
    Alert.alert("Allocate Shift", `Allocate shift to staff member ${staffId}`);
  };

  const handleViewStaff = (staffId: string) => {
    Alert.alert("Staff Details", `View details for staff ${staffId}`);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", onPress: () => {} },
      { text: "Logout", onPress: () => {} },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} scrollEnabled={true}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, Administrator</Text>
        </View>

        {/* Analytics Cards */}
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>24</Text>
            <Text style={styles.analyticsLabel}>Pending Applications</Text>
          </View>
          <View style={[styles.analyticsCard, styles.analyticsCardAlt]}>
            <Text style={[styles.analyticsValue, styles.analyticsValueAlt]}>8</Text>
            <Text style={[styles.analyticsLabel, styles.analyticsLabelAlt]}>Open Shifts</Text>
          </View>
        </View>

        <View style={styles.analyticsGrid}>
          <View style={[styles.analyticsCard, styles.analyticsCardAlt]}>
            <Text style={[styles.analyticsValue, styles.analyticsValueAlt]}>156</Text>
            <Text style={[styles.analyticsLabel, styles.analyticsLabelAlt]}>Total Staff</Text>
          </View>
          <View style={[styles.analyticsCard, styles.analyticsCardAlt]}>
            <Text style={[styles.analyticsValue, styles.analyticsValueAlt]}>42</Text>
            <Text style={[styles.analyticsLabel, styles.analyticsLabelAlt]}>This Week</Text>
          </View>
        </View>

        {/* Primary Action */}
        <TouchableOpacity style={styles.actionButton} onPress={handlePostShift}>
          <Text style={styles.actionButtonText}>+ Post New Shift</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: sectionColors.timesheets }]}
          onPress={() => router.push("/(admin)/timesheets")}
        >
          <Text style={styles.actionButtonText}>
            Review Timesheets{pendingTimesheets ? ` • ${pendingTimesheets} pending` : ""}
          </Text>
        </TouchableOpacity>

        {/* Shifts Management Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader(sectionColors.shifts)}
            onPress={() =>
              setExpandedSection(expandedSection === "shifts" ? null : "shifts")
            }
          >
            <Text style={styles.sectionTitle}>📅 Manage Shifts</Text>
            <Text style={styles.sectionIcon}>{expandedSection === "shifts" ? "▼" : "▶"}</Text>
          </TouchableOpacity>
          {expandedSection === "shifts" && (
            <View style={styles.sectionContent}>
              {shifts.map((shift, idx) => (
                <View key={shift.id}>
                  <View style={[styles.itemRow, idx === shifts.length - 1 && styles.itemRowLast]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{shift.title}</Text>
                      <Text style={styles.itemSubtext}>{shift.facility}</Text>
                      <Text style={styles.itemSubtext}>{shift.applicants} applicants</Text>
                    </View>
                    <View style={styles.statusBadge(shift.status)}>
                      <Text style={styles.statusText}>{shift.status}</Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionRowButton, styles.allocateButton]}
                      onPress={() => handleEditShift(shift.id)}
                    >
                      <Text style={styles.buttonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionRowButton, styles.rejectButton]}
                      onPress={() => handleDeleteShift(shift.id)}
                    >
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Applications Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader(sectionColors.applications)}
            onPress={() =>
              setExpandedSection(expandedSection === "applications" ? null : "applications")
            }
          >
            <Text style={styles.sectionTitle}>📋 Review Applications</Text>
            <Text style={styles.sectionIcon}>{expandedSection === "applications" ? "▼" : "▶"}</Text>
          </TouchableOpacity>
          {expandedSection === "applications" && (
            <View style={styles.sectionContent}>
              {applications.map((app, idx) => (
                <View key={app.id}>
                  <View style={[styles.itemRow, idx === applications.length - 1 && styles.itemRowLast]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{app.name}</Text>
                      <Text style={styles.itemSubtext}>{app.position} • {app.rating}</Text>
                    </View>
                    <View style={styles.statusBadge(app.status === "Approved" ? "Open" : "Pending")}>
                      <Text style={styles.statusText}>{app.status}</Text>
                    </View>
                  </View>
                  {app.status === "Pending" && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionRowButton, styles.approveButton]}
                        onPress={() => handleApproveApplication(app.id)}
                      >
                        <Text style={styles.buttonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionRowButton, styles.rejectButton]}
                        onPress={() => handleRejectApplication(app.id)}
                      >
                        <Text style={styles.buttonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Manage Staff Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader(sectionColors.staff)}
            onPress={() =>
              setExpandedSection(expandedSection === "staff" ? null : "staff")
            }
          >
            <Text style={styles.sectionTitle}>👥 Manage Staff</Text>
            <Text style={styles.sectionIcon}>{expandedSection === "staff" ? "▼" : "▶"}</Text>
          </TouchableOpacity>
          {expandedSection === "staff" && (
            <View style={styles.sectionContent}>
              {staffMembers.map((member, idx) => (
                <View key={member.id}>
                  <TouchableOpacity
                    style={[styles.itemRow, idx === staffMembers.length - 1 && styles.itemRowLast]}
                    onPress={() => handleViewStaff(member.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{member.name}</Text>
                      <Text style={styles.itemSubtext}>{member.role} • {member.rating}</Text>
                    </View>
                    <View style={styles.statusBadge("Open")}>
                      <Text style={styles.statusText}>{member.status}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Allocate Shifts Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader(sectionColors.allocate)}
            onPress={() =>
              setExpandedSection(expandedSection === "allocate" ? null : "allocate")
            }
          >
            <Text style={styles.sectionTitle}>🎯 Allocate Shifts</Text>
            <Text style={styles.sectionIcon}>{expandedSection === "allocate" ? "▼" : "▶"}</Text>
          </TouchableOpacity>
          {expandedSection === "allocate" && (
            <View style={styles.sectionContent}>
              {staffMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.menuItem}
                  onPress={() => handleAllocateShift(member.id)}
                >
                  <View>
                    <Text style={styles.menuItemText}>{member.name}</Text>
                    <Text style={styles.itemSubtext}>{member.role}</Text>
                  </View>
                  <Text style={styles.menuItemArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader(sectionColors.notifications)}
            onPress={() =>
              setExpandedSection(expandedSection === "notifications" ? null : "notifications")
            }
          >
            <Text style={styles.sectionTitle}>🔔 Notifications</Text>
            <Text style={styles.sectionIcon}>{expandedSection === "notifications" ? "▼" : "▶"}</Text>
          </TouchableOpacity>
          {expandedSection === "notifications" && (
            <View style={styles.sectionContent}>
              {notifications.map((notif, idx) => (
                <View key={notif.id} style={[styles.itemRow, idx === notifications.length - 1 && styles.itemRowLast]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{notif.icon} {notif.title}</Text>
                    <Text style={styles.itemSubtext}>{notif.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader(sectionColors.settings)}
            onPress={() =>
              setExpandedSection(expandedSection === "settings" ? null : "settings")
            }
          >
            <Text style={styles.sectionTitle}>⚙️ Settings</Text>
            <Text style={styles.sectionIcon}>{expandedSection === "settings" ? "▼" : "▶"}</Text>
          </TouchableOpacity>
          {expandedSection === "settings" && (
            <View style={styles.sectionContent}>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuItemText}>Account Settings</Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Text style={[styles.menuItemText, { color: "#F44336" }]}>Logout</Text>
                <Text style={styles.menuItemArrow}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Activity Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.sectionHeader(sectionColors.activity)}
            onPress={() =>
              setExpandedSection(expandedSection === "activity" ? null : "activity")
            }
          >
            <Text style={styles.sectionTitle}>📊 Recent Activity</Text>
            <Text style={styles.sectionIcon}>{expandedSection === "activity" ? "▼" : "▶"}</Text>
          </TouchableOpacity>
          {expandedSection === "activity" && (
            <View style={styles.sectionContent}>
              {recentActivity.map((activity, idx) => (
                <View key={idx} style={[styles.itemRow, idx === recentActivity.length - 1 && styles.itemRowLast]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{activity.icon} {activity.text}</Text>
                    <Text style={styles.itemSubtext}>{activity.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
