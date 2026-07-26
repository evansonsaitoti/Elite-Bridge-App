import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useTimekeeping } from "@/lib/timekeeping-context";

type SectionName =
  | "shifts"
  | "applications"
  | "staff"
  | "allocate"
  | "notifications"
  | "settings"
  | "activity";

export default function AdminHomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { entries } = useTimekeeping();
  const [expandedSection, setExpandedSection] = useState<SectionName | null>(null);

  const pendingTimesheets = entries.filter(
    (entry) =>
      entry.status === "completed" || entry.status === "correction_requested",
  ).length;

  const sectionColors = {
    shifts: "#FF6B6B",
    applications: "#4ECDC4",
    staff: "#45B7D1",
    allocate: "#FFA07A",
    notifications: "#98D8C8",
    settings: "#F7DC6F",
    activity: "#BB8FCE",
    timesheets: "#1B5E3F",
  };

  const shifts = [
    {
      id: "1",
      title: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living",
      status: "Open",
      applicants: 5,
    },
    {
      id: "2",
      title: "Activities Coordinator",
      facility: "Golden Years",
      status: "Open",
      applicants: 3,
    },
    {
      id: "3",
      title: "Dining Services Assistant",
      facility: "Meadowbrook",
      status: "Filled",
      applicants: 1,
    },
  ];

  const applications = [
    {
      id: "1",
      name: "Sarah Johnson",
      position: "Caregiver",
      status: "Pending",
      rating: "4.8⭐",
    },
    {
      id: "2",
      name: "James Wilson",
      position: "Activities Coordinator",
      status: "Pending",
      rating: "4.5⭐",
    },
    {
      id: "3",
      name: "Lisa Chen",
      position: "Dining Services",
      status: "Approved",
      rating: "4.7⭐",
    },
  ];

  const staffMembers = [
    {
      id: "1",
      name: "Sarah Johnson",
      role: "Caregiver",
      rating: "4.8⭐",
      status: "Active",
    },
    {
      id: "2",
      name: "Michael Chen",
      role: "Activities Coordinator",
      rating: "4.6⭐",
      status: "Active",
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      role: "Dining Services",
      rating: "4.9⭐",
      status: "Active",
    },
  ];

  const notifications = [
    {
      id: "1",
      icon: "🔔",
      title: "New Application",
      message: "Sarah Johnson applied for Caregiver",
    },
    {
      id: "2",
      icon: "✓",
      title: "Check Complete",
      message: "Michael Chen's background check cleared",
    },
    {
      id: "3",
      icon: "⏳",
      title: "Pending Review",
      message: "James Wilson's check is pending",
    },
  ];

  const recentActivity = [
    {
      icon: "📋",
      text: "Sarah Johnson applied for Caregiver",
      time: "2 min ago",
    },
    {
      icon: "✓",
      text: "Michael Chen's background check cleared",
      time: "15 min ago",
    },
    {
      icon: "✓",
      text: "Activities Coordinator shift filled",
      time: "1 hour ago",
    },
  ];

  const toggleSection = (section: SectionName) => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          setExpandedSection(null);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const styles = {
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { padding: 16, gap: 16, paddingBottom: 40 },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 4,
    },
    headerSubtitle: { fontSize: 14, color: colors.muted },
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
    analyticsValueAlt: { color: colors.primary },
    analyticsLabel: {
      fontSize: 11,
      color: "rgba(255,255,255,0.8)",
      marginTop: 4,
      textAlign: "center" as const,
    },
    analyticsLabelAlt: { color: colors.muted },
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
    sectionHeader: (backgroundColor: string) => ({
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor,
    }),
    sectionTitle: {
      fontSize: 15,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
    },
    sectionIcon: { fontSize: 20, color: "#FFFFFF" },
    sectionContent: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
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
    menuItemArrow: { fontSize: 16, color: colors.muted },
    itemName: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    itemSubtext: { fontSize: 11, color: colors.muted, marginTop: 2 },
    actionRow: { flexDirection: "row" as const, gap: 8, marginTop: 8 },
    smallButton: {
      flex: 1,
      borderRadius: 6,
      paddingVertical: 8,
      alignItems: "center" as const,
    },
    smallButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "bold" as const,
    },
  };

  const Section = ({
    name,
    title,
    color,
    children,
  }: {
    name: SectionName;
    title: string;
    color: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.sectionHeader(color)}
        onPress={() => toggleSection(name)}
        accessibilityRole="button"
        accessibilityState={{ expanded: expandedSection === name }}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionIcon}>
          {expandedSection === name ? "▼" : "▶"}
        </Text>
      </TouchableOpacity>
      {expandedSection === name ? (
        <View style={styles.sectionContent}>{children}</View>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, Administrator</Text>
        </View>

        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>24</Text>
            <Text style={styles.analyticsLabel}>Pending Applications</Text>
          </View>
          <View style={[styles.analyticsCard, styles.analyticsCardAlt]}>
            <Text style={[styles.analyticsValue, styles.analyticsValueAlt]}>8</Text>
            <Text style={[styles.analyticsLabel, styles.analyticsLabelAlt]}>
              Open Shifts
            </Text>
          </View>
        </View>

        <View style={styles.analyticsGrid}>
          <View style={[styles.analyticsCard, styles.analyticsCardAlt]}>
            <Text style={[styles.analyticsValue, styles.analyticsValueAlt]}>156</Text>
            <Text style={[styles.analyticsLabel, styles.analyticsLabelAlt]}>
              Total Staff
            </Text>
          </View>
          <View style={[styles.analyticsCard, styles.analyticsCardAlt]}>
            <Text style={[styles.analyticsValue, styles.analyticsValueAlt]}>42</Text>
            <Text style={[styles.analyticsLabel, styles.analyticsLabelAlt]}>
              This Week
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert("Post New Shift", "Shift creation is coming next.")}
        >
          <Text style={styles.actionButtonText}>+ Post New Shift</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: sectionColors.timesheets },
          ]}
          onPress={() => router.push("/(admin)/timesheets")}
        >
          <Text style={styles.actionButtonText}>
            Review Timesheets
            {pendingTimesheets ? ` • ${pendingTimesheets} pending` : ""}
          </Text>
        </TouchableOpacity>

        <Section name="shifts" title="📅 Manage Shifts" color={sectionColors.shifts}>
          {shifts.map((shift) => (
            <View key={shift.id} style={styles.menuItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{shift.title}</Text>
                <Text style={styles.itemSubtext}>{shift.facility}</Text>
                <Text style={styles.itemSubtext}>
                  {shift.status} • {shift.applicants} applicants
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.primary }]}
                    onPress={() => Alert.alert("Edit Shift", `Edit shift ${shift.id}`)}
                  >
                    <Text style={styles.smallButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: "#F44336" }]}
                    onPress={() =>
                      Alert.alert("Delete Shift", `Delete ${shift.title}?`)
                    }
                  >
                    <Text style={styles.smallButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </Section>

        <Section
          name="applications"
          title="📋 Review Applications"
          color={sectionColors.applications}
        >
          {applications.map((application) => (
            <View key={application.id} style={styles.menuItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{application.name}</Text>
                <Text style={styles.itemSubtext}>
                  {application.position} • {application.rating} • {application.status}
                </Text>
              </View>
              <Text style={styles.menuItemArrow}>→</Text>
            </View>
          ))}
        </Section>

        <Section name="staff" title="👥 Manage Staff" color={sectionColors.staff}>
          {staffMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.menuItem}
              onPress={() => Alert.alert("Staff Details", member.name)}
            >
              <View>
                <Text style={styles.itemName}>{member.name}</Text>
                <Text style={styles.itemSubtext}>
                  {member.role} • {member.rating} • {member.status}
                </Text>
              </View>
              <Text style={styles.menuItemArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </Section>

        <Section
          name="allocate"
          title="🎯 Allocate Shifts"
          color={sectionColors.allocate}
        >
          {staffMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.menuItem}
              onPress={() => Alert.alert("Allocate Shift", member.name)}
            >
              <View>
                <Text style={styles.itemName}>{member.name}</Text>
                <Text style={styles.itemSubtext}>{member.role}</Text>
              </View>
              <Text style={styles.menuItemArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </Section>

        <Section
          name="notifications"
          title="🔔 Notifications"
          color={sectionColors.notifications}
        >
          {notifications.map((notification) => (
            <View key={notification.id} style={styles.menuItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {notification.icon} {notification.title}
                </Text>
                <Text style={styles.itemSubtext}>{notification.message}</Text>
              </View>
            </View>
          ))}
        </Section>

        <Section name="settings" title="⚙️ Settings" color={sectionColors.settings}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert("Account Settings", "Account settings are coming next.")}
          >
            <Text style={styles.menuItemText}>Account Settings</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Text style={[styles.menuItemText, { color: "#F44336" }]}>Logout</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
        </Section>

        <Section
          name="activity"
          title="📊 Recent Activity"
          color={sectionColors.activity}
        >
          {recentActivity.map((activity, index) => (
            <View key={`${activity.text}-${index}`} style={styles.menuItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {activity.icon} {activity.text}
                </Text>
                <Text style={styles.itemSubtext}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}
