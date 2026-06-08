import { ScrollView, Text, View, StyleSheet, Pressable, FlatList, Alert, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Admin Shift Allocation Screen - Allocate shifts to caregivers (Deputy-style)
 */
export default function AdminAllocateShiftScreen() {
  const colors = useColors();

  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [selectedCaregivers, setSelectedCaregivers] = useState<number[]>([]);
  const [allocationMessage, setAllocationMessage] = useState("");
  const [showAllocationForm, setShowAllocationForm] = useState(false);

  // Mock shifts data
  const shifts = [
    {
      id: 1,
      title: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living - Maple Grove",
      date: "Tomorrow",
      time: "8:00 AM - 4:00 PM",
      pay: "$18/hr",
      status: "open",
    },
    {
      id: 2,
      title: "Activities Coordinator",
      facility: "Golden Years Community Center",
      date: "Tomorrow",
      time: "10:00 AM - 6:00 PM",
      pay: "$16/hr",
      status: "open",
    },
    {
      id: 3,
      title: "Dining Services Assistant",
      facility: "Meadowbrook Assisted Living",
      date: "Day After Tomorrow",
      time: "9:00 AM - 5:00 PM",
      pay: "$17/hr",
      status: "open",
    },
  ];

  // Mock caregivers data
  const caregivers = [
    {
      id: 1,
      name: "Sarah Johnson",
      rating: 4.8,
      status: "available",
      experience: 3,
    },
    {
      id: 2,
      name: "Michael Chen",
      rating: 4.6,
      status: "available",
      experience: 2,
    },
    {
      id: 3,
      name: "Jennifer Martinez",
      rating: 4.5,
      status: "available",
      experience: 1,
    },
    {
      id: 4,
      name: "David Thompson",
      rating: 4.9,
      status: "available",
      experience: 5,
    },
    {
      id: 5,
      name: "Emma Wilson",
      rating: 4.2,
      status: "busy",
      experience: 2,
    },
  ];

  const handleSelectShift = (shift: any) => {
    setSelectedShift(shift);
    setSelectedCaregivers([]);
    setAllocationMessage("");
  };

  const handleToggleCaregiverSelection = (caregiverId: number) => {
    if (selectedCaregivers.includes(caregiverId)) {
      setSelectedCaregivers(selectedCaregivers.filter((id) => id !== caregiverId));
    } else {
      setSelectedCaregivers([...selectedCaregivers, caregiverId]);
    }
  };

  const handleAllocateShifts = () => {
    if (selectedCaregivers.length === 0) {
      Alert.alert("Error", "Please select at least one caregiver");
      return;
    }

    Alert.alert(
      "Confirm Allocation",
      `Allocate "${selectedShift.title}" to ${selectedCaregivers.length} caregiver(s)?`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Allocate",
          onPress: () => {
            Alert.alert("Success", "Shift allocated to selected caregivers");
            setSelectedShift(null);
            setSelectedCaregivers([]);
            setAllocationMessage("");
            setShowAllocationForm(false);
          },
        },
      ]
    );
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
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.foreground,
    },
    shiftCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 10,
    },
    shiftTitle: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.foreground,
    },
    shiftFacility: {
      fontSize: 13,
      color: colors.muted,
    },
    shiftMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    shiftTime: {
      fontSize: 12,
      color: colors.muted,
    },
    shiftPay: {
      fontSize: 13,
      fontWeight: "bold",
      color: colors.primary,
    },
    caregiverCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 10,
      flexDirection: "row",
      alignItems: "center",
    },
    caregiverCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    checkboxText: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.background,
    },
    caregiverInfo: {
      flex: 1,
      gap: 4,
    },
    caregiverName: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.foreground,
    },
    caregiverMeta: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    caregiverRating: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
    caregiverStatus: {
      fontSize: 11,
      color: colors.muted,
      fontStyle: "italic",
    },
    formSection: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "bold",
      color: colors.foreground,
    },
    messageInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      color: colors.foreground,
      minHeight: 80,
      textAlignVertical: "top",
    },
    allocateButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    allocateButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.background,
    },
    cancelButton: {
      backgroundColor: colors.muted,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: 14,
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

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Allocate Shifts</Text>
            <Text style={styles.headerSubtitle}>
              Assign shifts to caregivers (Deputy-style)
            </Text>
          </View>

          {!selectedShift ? (
            <>
              {/* Select Shift */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Step 1: Select a Shift</Text>
                <FlatList
                  data={shifts}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item: shift }) => (
                    <Pressable
                      onPress={() => handleSelectShift(shift)}
                      style={[
                        styles.shiftCard,
                        {
                          marginBottom: 12,
                          borderColor: selectedShift?.id === shift.id ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.shiftTitle}>{shift.title}</Text>
                      <Text style={styles.shiftFacility}>{shift.facility}</Text>
                      <View style={styles.shiftMeta}>
                        <Text style={styles.shiftTime}>
                          {shift.date} • {shift.time}
                        </Text>
                        <Text style={styles.shiftPay}>{shift.pay}</Text>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            </>
          ) : (
            <>
              {/* Selected Shift Summary */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Selected Shift</Text>
                <View style={[styles.shiftCard, { borderColor: colors.primary }]}>
                  <Text style={styles.shiftTitle}>{selectedShift.title}</Text>
                  <Text style={styles.shiftFacility}>{selectedShift.facility}</Text>
                  <View style={styles.shiftMeta}>
                    <Text style={styles.shiftTime}>
                      {selectedShift.date} • {selectedShift.time}
                    </Text>
                    <Text style={styles.shiftPay}>{selectedShift.pay}</Text>
                  </View>
                </View>
              </View>

              {/* Select Caregivers */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Step 2: Select Caregivers ({selectedCaregivers.length} selected)
                </Text>
                <FlatList
                  data={caregivers}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item: caregiver }) => (
                    <Pressable
                      onPress={() => handleToggleCaregiverSelection(caregiver.id)}
                      style={[
                        styles.caregiverCard,
                        {
                          marginBottom: 12,
                          borderColor: selectedCaregivers.includes(caregiver.id)
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.caregiverCheckbox}>
                        {selectedCaregivers.includes(caregiver.id) && (
                          <Text style={styles.checkboxText}>✓</Text>
                        )}
                      </View>
                      <View style={styles.caregiverInfo}>
                        <Text style={styles.caregiverName}>{caregiver.name}</Text>
                        <View style={styles.caregiverMeta}>
                          <Text style={styles.caregiverRating}>⭐ {caregiver.rating}</Text>
                          <Text style={styles.caregiverStatus}>
                            {caregiver.experience} yrs • {caregiver.status}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>

              {/* Allocation Message */}
              {selectedCaregivers.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.formSection}>
                    <Text style={styles.label}>Optional Message</Text>
                    <TextInput
                      style={styles.messageInput}
                      placeholder="Add a message for the caregivers..."
                      placeholderTextColor={colors.muted}
                      value={allocationMessage}
                      onChangeText={setAllocationMessage}
                      multiline
                    />
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.section}>
                <Pressable
                  style={styles.allocateButton}
                  onPress={handleAllocateShifts}
                  disabled={selectedCaregivers.length === 0}
                >
                  <Text style={styles.allocateButtonText}>
                    Allocate to {selectedCaregivers.length} Caregiver{selectedCaregivers.length !== 1 ? "s" : ""}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setSelectedShift(null);
                    setSelectedCaregivers([]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
