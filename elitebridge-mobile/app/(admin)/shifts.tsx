import { View, Text, ScrollView, TextInput, TouchableOpacity, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo } from "react";

/**
 * Admin Shifts Screen - Manage posted shifts with search and filtering
 */
export default function AdminShiftsScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "filled">("all");

  const mockShifts = [
    {
      id: 1,
      title: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living",
      location: "Maple Grove",
      date: "Tomorrow",
      time: "8:00 AM - 4:00 PM",
      status: "open" as const,
      applicants: 5,
      pay: "$18/hr",
    },
    {
      id: 2,
      title: "Activities Coordinator",
      facility: "Golden Years Community Center",
      location: "Downtown",
      date: "Tomorrow",
      time: "10:00 AM - 6:00 PM",
      status: "open" as const,
      applicants: 3,
      pay: "$16/hr",
    },
    {
      id: 3,
      title: "Dining Services Assistant",
      facility: "Meadowbrook Assisted Living",
      location: "Westside",
      date: "Day After Tomorrow",
      time: "9:00 AM - 5:00 PM",
      status: "filled" as const,
      applicants: 1,
      pay: "$17/hr",
    },
    {
      id: 4,
      title: "Caregiver - Memory Care",
      facility: "Sunrise Senior Living",
      location: "Maple Grove",
      date: "Next Week",
      time: "2:00 PM - 10:00 PM",
      status: "open" as const,
      applicants: 2,
      pay: "$19/hr",
    },
  ];

  // Filter shifts based on search query and status
  const filteredShifts = useMemo(() => {
    return mockShifts.filter((shift) => {
      const matchesSearch =
        shift.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shift.facility.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shift.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || shift.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

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
    searchContainer: {
      gap: 12,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.foreground,
    },
    filterContainer: {
      flexDirection: "row" as const,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: "600" as const,
    },
    filterButtonTextActive: {
      color: colors.background,
    },
    filterButtonTextInactive: {
      color: colors.foreground,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    shiftCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      gap: 10,
    },
    shiftHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
    },
    shiftInfo: {
      flex: 1,
    },
    shiftTitle: {
      fontSize: 15,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 2,
    },
    shiftFacility: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 2,
    },
    shiftLocation: {
      fontSize: 12,
      color: colors.muted,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      alignItems: "center" as const,
    },
    statusBadgeOpen: {
      backgroundColor: colors.success,
    },
    statusBadgeFilled: {
      backgroundColor: colors.muted,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    shiftDetails: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailItem: {
      alignItems: "center" as const,
      flex: 1,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    actionButtons: {
      flexDirection: "row" as const,
      gap: 8,
    },
    editButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center" as const,
    },
    deleteButton: {
      flex: 1,
      backgroundColor: colors.error,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center" as const,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    emptyState: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.muted,
    },
    resultCount: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
    },
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shifts</Text>
          <Text style={styles.headerSubtitle}>Manage your posted shifts</Text>
        </View>

        {/* Post New Shift Button */}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>+ Post New Shift</Text>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, facility, or location..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === "all" ? styles.filterButtonActive : styles.filterButtonInactive,
              ]}
              onPress={() => setStatusFilter("all")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === "all"
                    ? styles.filterButtonTextActive
                    : styles.filterButtonTextInactive,
                ]}
              >
                All Shifts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === "open" ? styles.filterButtonActive : styles.filterButtonInactive,
              ]}
              onPress={() => setStatusFilter("open")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === "open"
                    ? styles.filterButtonTextActive
                    : styles.filterButtonTextInactive,
                ]}
              >
                Open
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === "filled" ? styles.filterButtonActive : styles.filterButtonInactive,
              ]}
              onPress={() => setStatusFilter("filled")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === "filled"
                    ? styles.filterButtonTextActive
                    : styles.filterButtonTextInactive,
                ]}
              >
                Filled
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        {filteredShifts.length > 0 && (
          <Text style={styles.resultCount}>
            Showing {filteredShifts.length} of {mockShifts.length} shifts
          </Text>
        )}

        {/* Shifts List */}
        {filteredShifts.length > 0 ? (
          <FlatList
            data={filteredShifts}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.shiftCard}>
                <View style={styles.shiftHeader}>
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftTitle}>{item.title}</Text>
                    <Text style={styles.shiftFacility}>{item.facility}</Text>
                    <Text style={styles.shiftLocation}>{item.location}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "open" ? styles.statusBadgeOpen : styles.statusBadgeFilled,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.shiftDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{item.date}</Text>
                    <Text style={styles.detailLabel}>Date</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{item.time}</Text>
                    <Text style={styles.detailLabel}>Time</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{item.pay}</Text>
                    <Text style={styles.detailLabel}>Pay</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailValue}>{item.applicants}</Text>
                    <Text style={styles.detailLabel}>Applicants</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.editButton}>
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton}>
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No shifts found</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
