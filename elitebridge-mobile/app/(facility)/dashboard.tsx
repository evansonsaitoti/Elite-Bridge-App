import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

export default function FacilityDashboardScreen() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const shifts = [
    {
      id: "1",
      title: "Caregiver",
      date: "May 25, 2026",
      time: "8:00 AM - 4:00 PM",
      applicants: 5,
      filled: false,
      payRate: "$18/hr",
    },
    {
      id: "2",
      title: "Activities Coordinator",
      date: "May 26, 2026",
      time: "10:00 AM - 6:00 PM",
      applicants: 3,
      filled: false,
      payRate: "$16/hr",
    },
    {
      id: "3",
      title: "Dining Services",
      date: "May 27, 2026",
      time: "9:00 AM - 5:00 PM",
      applicants: 1,
      filled: true,
      payRate: "$17/hr",
    },
  ];

  const staffRatings = [
    { name: "Sarah Johnson", rating: 4.8, shifts: 12, status: "Excellent" },
    { name: "Michael Chen", rating: 4.5, shifts: 8, status: "Good" },
    { name: "Jessica Martinez", rating: 4.9, shifts: 15, status: "Excellent" },
  ];

  const payrollData = [
    { shift: "Caregiver - May 25", staff: "Sarah Johnson", hours: 8, rate: 18, total: 144 },
    { shift: "Activities - May 26", staff: "Michael Chen", hours: 8, rate: 16, total: 128 },
    { shift: "Dining - May 27", staff: "Jessica Martinez", hours: 8, rate: 17, total: 136 },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Facility Dashboard</Text>
          <Text style={styles.subtitle}>Sunrise Senior Living</Text>
        </View>

        {/* Analytics Cards */}
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>8</Text>
            <Text style={styles.analyticsLabel}>Open Shifts</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>24</Text>
            <Text style={styles.analyticsLabel}>Pending Apps</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>156</Text>
            <Text style={styles.analyticsLabel}>Available Staff</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsValue}>$2,408</Text>
            <Text style={styles.analyticsLabel}>Weekly Payroll</Text>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>+ Post New Shift</Text>
        </TouchableOpacity>

        {/* Manage Shifts Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#FF6B6B" }]}
          onPress={() => toggleSection("shifts")}
        >
          <Text style={styles.sectionTitle}>📅 Manage Shifts</Text>
          <Text style={styles.expandIcon}>{expandedSection === "shifts" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "shifts" && (
          <View style={styles.sectionContent}>
            {shifts.map((shift) => (
              <View key={shift.id} style={styles.shiftCard}>
                <View style={styles.shiftHeader}>
                  <View>
                    <Text style={styles.shiftTitle}>{shift.title}</Text>
                    <Text style={styles.shiftDate}>{shift.date} • {shift.time}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      shift.filled
                        ? { backgroundColor: "#ccc" }
                        : { backgroundColor: "#4CAF50" },
                    ]}
                  >
                    <Text style={styles.statusText}>{shift.filled ? "Filled" : "Open"}</Text>
                  </View>
                </View>
                <View style={styles.shiftDetails}>
                  <Text style={styles.shiftDetail}>💰 {shift.payRate}</Text>
                  <Text style={styles.shiftDetail}>👥 {shift.applicants} applicants</Text>
                </View>
                <View style={styles.shiftActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Staff Ratings Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#4ECDC4" }]}
          onPress={() => toggleSection("ratings")}
        >
          <Text style={styles.sectionTitle}>⭐ Staff Ratings</Text>
          <Text style={styles.expandIcon}>{expandedSection === "ratings" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "ratings" && (
          <View style={styles.sectionContent}>
            {staffRatings.map((staff, index) => (
              <View key={index} style={styles.ratingCard}>
                <View style={styles.ratingHeader}>
                  <View>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffDetail}>{staff.shifts} shifts completed</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ {staff.rating}</Text>
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{staff.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Payroll Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#F7DC6F" }]}
          onPress={() => toggleSection("payroll")}
        >
          <Text style={styles.sectionTitle}>💳 Payroll Management</Text>
          <Text style={styles.expandIcon}>{expandedSection === "payroll" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "payroll" && (
          <View style={styles.sectionContent}>
            <View style={styles.payrollSummary}>
              <Text style={styles.payrollLabel}>Total This Week:</Text>
              <Text style={styles.payrollTotal}>$408.00</Text>
            </View>

            {payrollData.map((item, index) => (
              <View key={index} style={styles.payrollItem}>
                <View>
                  <Text style={styles.payrollShift}>{item.shift}</Text>
                  <Text style={styles.payrollStaff}>{item.staff}</Text>
                </View>
                <View style={styles.payrollAmount}>
                  <Text style={styles.payrollHours}>{item.hours}h @ ${item.rate}/hr</Text>
                  <Text style={styles.payrollCost}>${item.total}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.exportButton}>
              <Text style={styles.exportButtonText}>📊 Export Payroll Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Performance Metrics Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#BB8FCE" }]}
          onPress={() => toggleSection("metrics")}
        >
          <Text style={styles.sectionTitle}>📈 Performance Metrics</Text>
          <Text style={styles.expandIcon}>{expandedSection === "metrics" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "metrics" && (
          <View style={styles.sectionContent}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Average Staff Rating</Text>
              <Text style={styles.metricValue}>4.7/5.0</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Shift Fill Rate</Text>
              <Text style={styles.metricValue}>87%</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Staff Retention</Text>
              <Text style={styles.metricValue}>92%</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Average Response Time</Text>
              <Text style={styles.metricValue}>2.3 hours</Text>
            </View>
          </View>
        )}

        {/* Settings Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#45B7D1" }]}
          onPress={() => toggleSection("settings")}
        >
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>
          <Text style={styles.expandIcon}>{expandedSection === "settings" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "settings" && (
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Facility Information</Text>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Payment Methods</Text>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Notification Preferences</Text>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingLabel}>Logout</Text>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  analyticsCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E3F",
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  analyticsLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#1B5E3F",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  expandIcon: {
    fontSize: 16,
    color: "#fff",
  },
  sectionContent: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    borderRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  shiftCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  shiftDate: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  shiftDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  shiftDetail: {
    fontSize: 13,
    color: "#666",
  },
  shiftActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#1B5E3F",
    borderRadius: 6,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  ratingCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  staffDetail: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  ratingBadge: {
    backgroundColor: "#fff3e0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f57c00",
  },
  payrollSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 12,
  },
  payrollLabel: {
    fontSize: 14,
    color: "#666",
  },
  payrollTotal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  payrollItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  payrollShift: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  payrollStaff: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  payrollAmount: {
    alignItems: "flex-end",
  },
  payrollHours: {
    fontSize: 13,
    color: "#666",
  },
  payrollCost: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B5E3F",
    marginTop: 4,
  },
  exportButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1B5E3F",
    borderRadius: 6,
    alignItems: "center",
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  metricItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  metricLabel: {
    fontSize: 14,
    color: "#666",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingLabel: {
    fontSize: 14,
    color: "#333",
  },
  settingArrow: {
    fontSize: 16,
    color: "#1B5E3F",
  },
});
