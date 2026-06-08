import { ScrollView, Text, View, StyleSheet, Pressable, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Admin Applications Screen - Review and manage staff applications
 */
export default function AdminApplicationsScreen() {
  const colors = useColors();

  const [applications, setApplications] = useState([
    {
      id: 1,
      staffName: "Sarah Johnson",
      position: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living - Maple Grove",
      appliedDate: "Today at 2:30 PM",
      status: "pending",
      rating: 4.8,
    },
    {
      id: 2,
      staffName: "Michael Chen",
      position: "Activities Coordinator",
      facility: "Golden Years Community Center",
      appliedDate: "Yesterday at 10:15 AM",
      status: "pending",
      rating: 4.6,
    },
    {
      id: 3,
      staffName: "Jennifer Martinez",
      position: "Dining Services Assistant",
      facility: "Meadowbrook Assisted Living",
      appliedDate: "2 days ago",
      status: "pending",
      rating: 4.5,
    },
    {
      id: 4,
      staffName: "David Thompson",
      position: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living - Maple Grove",
      appliedDate: "3 days ago",
      status: "approved",
      rating: 4.9,
    },
    {
      id: 5,
      staffName: "Emma Wilson",
      position: "Activities Coordinator",
      facility: "Golden Years Community Center",
      appliedDate: "1 week ago",
      status: "rejected",
      rating: 4.2,
    },
  ]);

  const handleApprove = (id: number) => {
    setApplications(
      applications.map((app) =>
        app.id === id ? { ...app, status: "approved" } : app
      )
    );
    Alert.alert("Application Approved", "The applicant has been notified of their approval.");
  };

  const handleReject = (id: number) => {
    setApplications(
      applications.map((app) =>
        app.id === id ? { ...app, status: "rejected" } : app
      )
    );
    Alert.alert("Application Rejected", "The applicant has been notified.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return colors.success;
      case "rejected":
        return colors.error;
      default:
        return colors.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      default:
        return "Pending";
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    header: {
      gap: 8,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    applicationCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardHeader: {
      gap: 4,
    },
    staffName: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.foreground,
    },
    position: {
      fontSize: 13,
      color: colors.muted,
    },
    facility: {
      fontSize: 13,
      color: colors.muted,
    },
    cardMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ratingText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.primary,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.background,
    },
    appliedDate: {
      fontSize: 12,
      color: colors.muted,
    },
    actionButtons: {
      flexDirection: "row",
      gap: 10,
    },
    approveButton: {
      flex: 1,
      backgroundColor: colors.success,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    rejectButton: {
      flex: 1,
      backgroundColor: colors.error,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    disabledButton: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.background,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.muted,
    },
  });

  const pendingApplications = applications.filter((app) => app.status === "pending");

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Applications</Text>
            <Text style={styles.headerSubtitle}>
              {pendingApplications.length} pending • {applications.length} total
            </Text>
          </View>

          {/* Applications List */}
          {applications.length > 0 ? (
            <FlatList
              data={applications}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.applicationCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.staffName}>{item.staffName}</Text>
                    <Text style={styles.position}>{item.position}</Text>
                    <Text style={styles.facility}>{item.facility}</Text>
                  </View>

                  <View style={styles.cardMeta}>
                    <Text style={styles.ratingText}>⭐ {item.rating}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                    </View>
                  </View>

                  <Text style={styles.appliedDate}>{item.appliedDate}</Text>

                  {item.status === "pending" && (
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={styles.approveButton}
                        onPress={() => handleApprove(item.id)}
                      >
                        <Text style={styles.buttonText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        style={styles.rejectButton}
                        onPress={() => handleReject(item.id)}
                      >
                        <Text style={styles.buttonText}>Reject</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No applications yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
