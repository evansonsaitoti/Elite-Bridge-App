import { ScrollView, Text, View, FlatList, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

/**
 * User Applications Screen - View my shift applications
 * Phase 2: Enhanced styling with status indicators
 */
export default function UserApplicationsScreen() {
  const colors = useColors();

  const mockApplications = [
    {
      id: 1,
      shiftTitle: "Caregiver - Assisted Living",
      location: "Sunrise Senior Living - Maple Grove",
      date: "Tomorrow",
      status: "pending",
      appliedDate: "Today at 2:30 PM",
    },
    {
      id: 2,
      shiftTitle: "Activities Coordinator",
      location: "Golden Years Community Center",
      date: "Tomorrow",
      status: "approved",
      appliedDate: "Yesterday at 10:15 AM",
    },
    {
      id: 3,
      shiftTitle: "Dining Services Assistant",
      location: "Meadowbrook Assisted Living",
      date: "Day After Tomorrow",
      status: "rejected",
      appliedDate: "2 days ago",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return colors.success;
      case "rejected":
        return colors.error;
      case "pending":
      default:
        return colors.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    cardLeft: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.foreground,
    },
    cardLocation: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
    },
    statusBadge: {
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "bold",
      color: "white",
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    cardBottom: {
      gap: 4,
    },
    cardDate: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.foreground,
    },
    cardAppliedDate: {
      fontSize: 12,
      color: colors.muted,
    },
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Applications</Text>
            <Text style={styles.headerSubtitle}>Track your shift applications</Text>
          </View>

          {/* Applications List */}
          <FlatList
            data={mockApplications}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.applicationCard}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardTitle}>{item.shiftTitle}</Text>
                    <Text style={styles.cardLocation}>{item.location}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardBottom}>
                  <Text style={styles.cardDate}>{item.date}</Text>
                  <Text style={styles.cardAppliedDate}>Applied {item.appliedDate}</Text>
                </View>
              </View>
            )}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
