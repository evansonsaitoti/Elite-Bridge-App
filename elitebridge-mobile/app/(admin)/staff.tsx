import { View, Text, TouchableOpacity, FlatList, ScrollView, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Admin Staff Screen - View and manage staff members with background check status
 */
export default function AdminStaffScreen() {
  const colors = useColors();
  const [expandedStaffId, setExpandedStaffId] = useState<number | null>(null);

  const mockStaff = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Caregiver",
      facility: "Sunrise Senior Living",
      status: "active",
      rating: 4.8,
      shifts: 12,
      backgroundCheck: {
        status: "clear",
        completedAt: "2024-05-15",
        checkrId: "cand_123456",
      },
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Activities Coordinator",
      facility: "Golden Years",
      status: "active",
      rating: 4.6,
      shifts: 8,
      backgroundCheck: {
        status: "clear",
        completedAt: "2024-05-10",
        checkrId: "cand_234567",
      },
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      role: "Dining Services",
      facility: "Meadowbrook",
      status: "active",
      rating: 4.9,
      shifts: 15,
      backgroundCheck: {
        status: "clear",
        completedAt: "2024-05-12",
        checkrId: "cand_345678",
      },
    },
    {
      id: 4,
      name: "James Wilson",
      role: "Caregiver",
      facility: "Sunrise Senior Living",
      status: "inactive",
      rating: 4.5,
      shifts: 5,
      backgroundCheck: {
        status: "pending",
        completedAt: null,
        checkrId: "cand_456789",
      },
    },
    {
      id: 5,
      name: "Lisa Anderson",
      role: "Caregiver",
      facility: "Golden Years",
      status: "active",
      rating: 4.7,
      shifts: 10,
      backgroundCheck: {
        status: "consider",
        completedAt: "2024-05-18",
        checkrId: "cand_567890",
      },
    },
  ];

  const getBackgroundCheckColor = (status: string) => {
    switch (status) {
      case "clear":
        return colors.success;
      case "pending":
        return colors.warning;
      case "consider":
        return "#FF9800";
      default:
        return colors.muted;
    }
  };

  const getBackgroundCheckIcon = (status: string) => {
    switch (status) {
      case "clear":
        return "✓";
      case "pending":
        return "⏳";
      case "consider":
        return "⚠";
      default:
        return "?";
    }
  };

  const handleInitiateCheck = (staffId: number, staffName: string) => {
    Alert.alert(
      "Initiate Background Check",
      `Send background check invitation to ${staffName}?`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Send Invitation",
          onPress: () => {
            Alert.alert("Success", "Background check invitation sent to " + staffName);
          },
        },
      ]
    );
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      gap: 16,
      paddingBottom: 32,
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
    staffCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      gap: 10,
    },
    staffHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
    },
    staffInfo: {
      flex: 1,
    },
    staffName: {
      fontSize: 15,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 2,
    },
    staffRole: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 2,
    },
    staffFacility: {
      fontSize: 12,
      color: colors.muted,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      alignItems: "center" as const,
    },
    statusBadgeActive: {
      backgroundColor: colors.success,
    },
    statusBadgeInactive: {
      backgroundColor: colors.muted,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    staffStats: {
      flexDirection: "row" as const,
      justifyContent: "space-around" as const,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statItem: {
      alignItems: "center" as const,
      flex: 1,
    },
    statValue: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    backgroundCheckSection: {
      backgroundColor: "rgba(0,0,0,0.02)",
      borderRadius: 8,
      padding: 10,
      gap: 8,
    },
    backgroundCheckLabel: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.muted,
    },
    backgroundCheckBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: "flex-start" as const,
    },
    backgroundCheckIcon: {
      fontSize: 16,
    },
    backgroundCheckStatus: {
      fontSize: 12,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    backgroundCheckDate: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 4,
    },
    initiateButton: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: "center" as const,
      marginTop: 6,
    },
    initiateButtonText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    buttonText: {
      color: colors.background,
      fontWeight: "600" as const,
      fontSize: 13,
    },
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Staff</Text>
          <Text style={styles.headerSubtitle}>Manage your team members</Text>
        </View>

        {/* Staff List */}
        <FlatList
          data={mockStaff}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.staffCard}
              onPress={() =>
                setExpandedStaffId(expandedStaffId === item.id ? null : item.id)
              }
            >
              <View style={styles.staffHeader}>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <Text style={styles.staffRole}>{item.role}</Text>
                  <Text style={styles.staffFacility}>{item.facility}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === "active" ? styles.statusBadgeActive : styles.statusBadgeInactive,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.staffStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>⭐ {item.rating}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{item.shifts}</Text>
                  <Text style={styles.statLabel}>Shifts</Text>
                </View>
              </View>

              {/* Background Check Status */}
              <View style={styles.backgroundCheckSection}>
                <Text style={styles.backgroundCheckLabel}>Background Check</Text>
                <View
                  style={[
                    styles.backgroundCheckBadge,
                    { backgroundColor: getBackgroundCheckColor(item.backgroundCheck.status) },
                  ]}
                >
                  <Text style={styles.backgroundCheckIcon}>
                    {getBackgroundCheckIcon(item.backgroundCheck.status)}
                  </Text>
                  <Text style={styles.backgroundCheckStatus}>
                    {item.backgroundCheck.status.charAt(0).toUpperCase() +
                      item.backgroundCheck.status.slice(1)}
                  </Text>
                </View>
                {item.backgroundCheck.completedAt && (
                  <Text style={styles.backgroundCheckDate}>
                    Completed: {item.backgroundCheck.completedAt}
                  </Text>
                )}
                {item.backgroundCheck.status === "pending" && (
                  <TouchableOpacity
                    style={styles.initiateButton}
                    onPress={() => handleInitiateCheck(item.id, item.name)}
                  >
                    <Text style={styles.initiateButtonText}>Send Invitation</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.buttonText}>View Full Profile</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </ScrollView>
    </ScreenContainer>
  );
}
