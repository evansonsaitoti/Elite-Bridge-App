import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

export default function StaffDashboardScreen() {
  const [expandedSection, setExpandedSection] = useState<string | null>("shifts");

  const staffProfile = {
    name: "Sarah Johnson",
    role: "Caregiver",
    rating: 4.8,
    reviews: 24,
    backgroundCheck: "Clear",
    bankAccount: "••••••1234",
    totalEarnings: 2850,
    hoursWorked: 142,
  };

  const availableShifts = [
    {
      id: "1",
      title: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living",
      location: "Maple Grove",
      date: "May 23, 2026",
      time: "8:00 AM - 4:00 PM",
      pay: "$18/hr",
      applicants: "5 others applied",
      status: "Open",
    },
    {
      id: "2",
      title: "Activities Coordinator",
      facility: "Golden Years Community",
      location: "Downtown",
      date: "May 24, 2026",
      time: "10:00 AM - 6:00 PM",
      pay: "$16/hr",
      applicants: "3 others applied",
      status: "Open",
    },
    {
      id: "3",
      title: "Dining Services Assistant",
      facility: "Meadowbrook Assisted Living",
      location: "Westside",
      date: "May 25, 2026",
      time: "9:00 AM - 5:00 PM",
      pay: "$17/hr",
      applicants: "2 others applied",
      status: "Open",
    },
  ];

  const applications = [
    {
      id: "1",
      title: "Caregiver",
      facility: "Sunrise Senior Living",
      appliedDate: "May 20, 2026",
      status: "Under Review",
      statusColor: "#FF9800",
    },
    {
      id: "2",
      title: "Activities Coordinator",
      facility: "Golden Years Community",
      appliedDate: "May 18, 2026",
      status: "Approved",
      statusColor: "#4CAF50",
    },
  ];

  const shiftSwaps = [
    {
      id: "1",
      title: "Caregiver Shift",
      facility: "Sunrise Senior Living",
      date: "May 25, 2026",
      time: "2:00 PM - 10:00 PM",
      offeredBy: "Jessica Martinez",
      reason: "Family emergency",
      status: "Available",
    },
    {
      id: "2",
      title: "Dining Services",
      facility: "Meadowbrook Assisted Living",
      date: "May 26, 2026",
      time: "8:00 AM - 4:00 PM",
      offeredBy: "Michael Chen",
      reason: "Doctor appointment",
      status: "Available",
    },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header with Profile */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SJ</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{staffProfile.name}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.rating}>⭐ {staffProfile.rating}</Text>
                <Text style={styles.reviews}>({staffProfile.reviews} reviews)</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>${staffProfile.totalEarnings}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{staffProfile.hoursWorked}h</Text>
              <Text style={styles.statLabel}>Hours Worked</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>✓</Text>
              <Text style={styles.statLabel}>Background</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.actionIcon}>🕐</Text>
            <Text style={styles.actionText}>Clock In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionText}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Available Shifts Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#FF6B6B" }]}
          onPress={() => toggleSection("shifts")}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={styles.sectionTitle}>Available Shifts</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{availableShifts.length}</Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>{expandedSection === "shifts" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "shifts" && (
          <View style={styles.sectionContent}>
            {availableShifts.map((shift) => (
              <View key={shift.id} style={styles.shiftCard}>
                <View style={styles.shiftHeader}>
                  <View>
                    <Text style={styles.shiftTitle}>{shift.title}</Text>
                    <Text style={styles.shiftFacility}>{shift.facility}</Text>
                  </View>
                  <View style={styles.payBadge}>
                    <Text style={styles.payText}>{shift.pay}</Text>
                  </View>
                </View>
                <View style={styles.shiftDetails}>
                  <Text style={styles.detailText}>📍 {shift.location}</Text>
                  <Text style={styles.detailText}>📅 {shift.date}</Text>
                  <Text style={styles.detailText}>🕐 {shift.time}</Text>
                  <Text style={styles.detailText}>👥 {shift.applicants}</Text>
                </View>
                <TouchableOpacity style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>Apply Now →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Applications Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#4ECDC4" }]}
          onPress={() => toggleSection("applications")}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionTitle}>My Applications</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{applications.length}</Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>{expandedSection === "applications" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "applications" && (
          <View style={styles.sectionContent}>
            {applications.map((app) => (
              <View key={app.id} style={styles.applicationCard}>
                <View style={styles.appHeader}>
                  <View>
                    <Text style={styles.appTitle}>{app.title}</Text>
                    <Text style={styles.appFacility}>{app.facility}</Text>
                    <Text style={styles.appDate}>Applied: {app.appliedDate}</Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: app.statusColor }]}
                  >
                    <Text style={styles.statusText}>{app.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bank Account & Payment Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#45B7D1" }]}
          onPress={() => toggleSection("payment")}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionIcon}>💳</Text>
            <Text style={styles.sectionTitle}>Payment Settings</Text>
          </View>
          <Text style={styles.expandIcon}>{expandedSection === "payment" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "payment" && (
          <View style={styles.sectionContent}>
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentLabel}>Bank Account</Text>
                <Text style={styles.paymentValue}>{staffProfile.bankAccount}</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>✏️ Update Bank Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.paymentCard}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <View style={styles.paymentMethodBox}>
                <Text style={styles.methodIcon}>🏦</Text>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>Direct Deposit</Text>
                  <Text style={styles.methodDesc}>Deposits every Friday</Text>
                </View>
              </View>
            </View>

            <View style={styles.paymentCard}>
              <Text style={styles.paymentLabel}>Tax Documents</Text>
              <TouchableOpacity style={styles.documentButton}>
                <Text style={styles.documentButtonText}>📄 Download 1099 Form</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.documentButton}>
                <Text style={styles.documentButtonText}>📊 View Tax Summary</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Background Check Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#FFA07A" }]}
          onPress={() => toggleSection("background")}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionIcon}>✓</Text>
            <Text style={styles.sectionTitle}>Background Check</Text>
            <View style={[styles.badge, { backgroundColor: "#4CAF50" }]}>
              <Text style={styles.badgeText}>{staffProfile.backgroundCheck}</Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>{expandedSection === "background" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "background" && (
          <View style={styles.sectionContent}>
            <View style={styles.backgroundCard}>
              <View style={styles.checkStatusRow}>
                <Text style={styles.checkIcon}>✓</Text>
                <View>
                  <Text style={styles.checkTitle}>Background Check Status</Text>
                  <Text style={styles.checkStatus}>Clear - Verified on May 1, 2026</Text>
                </View>
              </View>

              <View style={styles.checkDetails}>
                <View style={styles.checkItem}>
                  <Text style={styles.checkItemIcon}>✓</Text>
                  <Text style={styles.checkItemText}>Criminal History Check</Text>
                </View>
                <View style={styles.checkItem}>
                  <Text style={styles.checkItemIcon}>✓</Text>
                  <Text style={styles.checkItemText}>Employment Verification</Text>
                </View>
                <View style={styles.checkItem}>
                  <Text style={styles.checkItemIcon}>✓</Text>
                  <Text style={styles.checkItemText}>Reference Checks</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.renewButton}>
                <Text style={styles.renewButtonText}>🔄 Renew Background Check</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Shift Swap Marketplace Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#98D8C8" }]}
          onPress={() => toggleSection("swaps")}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionIcon}>🔄</Text>
            <Text style={styles.sectionTitle}>Shift Swaps</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{shiftSwaps.length}</Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>{expandedSection === "swaps" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "swaps" && (
          <View style={styles.sectionContent}>
            <View style={styles.swapHeader}>
              <TouchableOpacity style={styles.swapTabActive}>
                <Text style={styles.swapTabText}>Available Swaps</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.swapTab}>
                <Text style={styles.swapTabTextInactive}>My Swap Requests</Text>
              </TouchableOpacity>
            </View>

            {shiftSwaps.map((swap) => (
              <View key={swap.id} style={styles.swapCard}>
                <View style={styles.swapCardHeader}>
                  <View>
                    <Text style={styles.swapTitle}>{swap.title}</Text>
                    <Text style={styles.swapFacility}>{swap.facility}</Text>
                  </View>
                  <View style={styles.swapStatusBadge}>
                    <Text style={styles.swapStatusText}>{swap.status}</Text>
                  </View>
                </View>

                <View style={styles.swapDetails}>
                  <Text style={styles.swapDetailText}>📅 {swap.date}</Text>
                  <Text style={styles.swapDetailText}>🕐 {swap.time}</Text>
                  <Text style={styles.swapDetailText}>👤 Offered by: {swap.offeredBy}</Text>
                  <Text style={styles.swapReason}>Reason: {swap.reason}</Text>
                </View>

                <View style={styles.swapActions}>
                  <TouchableOpacity style={styles.acceptButton}>
                    <Text style={styles.acceptButtonText}>✓ Accept Swap</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.messageButton}>
                    <Text style={styles.messageButtonText}>💬 Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.postSwapButton}>
              <Text style={styles.postSwapButtonText}>+ Post Your Shift for Swap</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Help & Support Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: "#F7DC6F" }]}
          onPress={() => toggleSection("support")}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionIcon}>❓</Text>
            <Text style={styles.sectionTitle}>Help & Support</Text>
          </View>
          <Text style={styles.expandIcon}>{expandedSection === "support" ? "▼" : "▶"}</Text>
        </TouchableOpacity>

        {expandedSection === "support" && (
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportButtonText}>📞 Contact Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportButtonText}>❓ FAQ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportButton}>
              <Text style={styles.supportButtonText}>📧 Send Feedback</Text>
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
    padding: 0,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1B5E3F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B5E3F",
    marginRight: 8,
  },
  reviews: {
    fontSize: 12,
    color: "#666",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#1B5E3F",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  quickActionsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 8,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  quickActionButton: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 8,
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  expandIcon: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  sectionContent: {
    backgroundColor: "#fff",
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
  },
  shiftCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E3F",
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  shiftTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  shiftFacility: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  payBadge: {
    backgroundColor: "#1B5E3F",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  payText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  shiftDetails: {
    gap: 4,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
  },
  applyButton: {
    backgroundColor: "#1B5E3F",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  applicationCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
  },
  appHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  appTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  appFacility: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  appDate: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  paymentCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  editButton: {
    backgroundColor: "#1B5E3F",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  paymentMethodBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  methodDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  documentButton: {
    backgroundColor: "#1B5E3F",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  documentButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  backgroundCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  checkStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkIcon: {
    fontSize: 24,
    color: "#4CAF50",
    marginRight: 12,
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  checkStatus: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  checkDetails: {
    gap: 8,
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkItemIcon: {
    fontSize: 16,
    color: "#4CAF50",
    marginRight: 8,
    fontWeight: "bold",
  },
  checkItemText: {
    fontSize: 13,
    color: "#333",
  },
  renewButton: {
    backgroundColor: "#1B5E3F",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  renewButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  swapHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  swapTabActive: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#1B5E3F",
    borderRadius: 6,
    alignItems: "center",
  },
  swapTab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    alignItems: "center",
  },
  swapTabText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  swapTabTextInactive: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  swapCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#98D8C8",
  },
  swapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  swapTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  swapFacility: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  swapStatusBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  swapStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  swapDetails: {
    gap: 4,
    marginBottom: 10,
  },
  swapDetailText: {
    fontSize: 12,
    color: "#666",
  },
  swapReason: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  swapActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  messageButton: {
    flex: 1,
    backgroundColor: "#1B5E3F",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  postSwapButton: {
    backgroundColor: "#1B5E3F",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  postSwapButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  supportButton: {
    backgroundColor: "#1B5E3F",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  supportButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
