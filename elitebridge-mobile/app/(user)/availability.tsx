import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Staff Availability Calendar - Allows caregivers to mark available dates/times
 */
export default function AvailabilityScreen() {
  const colors = useColors();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);

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
    calendarGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      marginBottom: 12,
    },
    dateButton: (selected: boolean) => ({
      flex: 1,
      minWidth: "30%",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: selected ? colors.primary : colors.background,
      borderWidth: 1,
      borderColor: selected ? colors.primary : colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    }),
    dateButtonText: (selected: boolean) => ({
      fontSize: 12,
      fontWeight: "bold" as const,
      color: selected ? colors.background : colors.foreground,
    }),
    dateLabel: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 4,
    },
    timeSlotGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      marginBottom: 12,
    },
    timeSlotButton: (selected: boolean) => ({
      flex: 1,
      minWidth: "48%",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: selected ? colors.primary : colors.background,
      borderWidth: 1,
      borderColor: selected ? colors.primary : colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    }),
    timeSlotText: (selected: boolean) => ({
      fontSize: 12,
      fontWeight: "bold" as const,
      color: selected ? colors.background : colors.foreground,
    }),
    summaryRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: "rgba(0,0,0,0.02)",
      borderRadius: 8,
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center" as const,
      marginTop: 12,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    infoBox: {
      backgroundColor: "rgba(27, 94, 63, 0.1)",
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 12,
      color: colors.foreground,
      lineHeight: 18,
    },
  };

  const upcomingDates = [
    { date: "May 23", day: "Thu" },
    { date: "May 24", day: "Fri" },
    { date: "May 25", day: "Sat" },
    { date: "May 26", day: "Sun" },
    { date: "May 27", day: "Mon" },
    { date: "May 28", day: "Tue" },
    { date: "May 29", day: "Wed" },
    { date: "May 30", day: "Thu" },
    { date: "May 31", day: "Fri" },
  ];

  const timeSlots = [
    "6:00 AM - 2:00 PM",
    "2:00 PM - 10:00 PM",
    "10:00 PM - 6:00 AM",
    "Flexible",
  ];

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const toggleTimeSlot = (slot: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} scrollEnabled={true}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Availability</Text>
          <Text style={styles.headerSubtitle}>Mark when you're available for shifts</Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📌 Select the dates and times you're available to work. Admins will use this to match you with suitable shifts.
          </Text>
        </View>

        {/* Date Selection */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#45B7D1")}>
            <Text style={styles.sectionTitle}>📅 Select Available Dates</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.calendarGrid}>
              {upcomingDates.map((dateObj, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.dateButton(selectedDates.includes(dateObj.date))}
                  onPress={() => toggleDate(dateObj.date)}
                >
                  <Text style={styles.dateButtonText(selectedDates.includes(dateObj.date))}>
                    {dateObj.date.split(" ")[1]}
                  </Text>
                  <Text style={styles.dateLabel}>{dateObj.day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Time Slot Selection */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#BB8FCE")}>
            <Text style={styles.sectionTitle}>⏰ Preferred Time Slots</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.timeSlotGrid}>
              {timeSlots.map((slot, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.timeSlotButton(selectedTimeSlots.includes(slot))}
                  onPress={() => toggleTimeSlot(slot)}
                >
                  <Text style={styles.timeSlotText(selectedTimeSlots.includes(slot))}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Recurring Availability */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#FF6B6B")}>
            <Text style={styles.sectionTitle}>🔄 Recurring Availability</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Every Monday</Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={{ fontSize: 18, color: colors.primary }}>☐</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Every Wednesday</Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={{ fontSize: 18, color: colors.primary }}>☐</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Every Friday</Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={{ fontSize: 18, color: colors.primary }}>☐</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Weekends Only</Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={{ fontSize: 18, color: colors.primary }}>☐</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#4CAF50")}>
            <Text style={styles.sectionTitle}>✓ Your Availability Summary</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Dates Selected</Text>
              <Text style={styles.summaryValue}>{selectedDates.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time Slots</Text>
              <Text style={styles.summaryValue}>{selectedTimeSlots.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Status</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold" as const, color: selectedDates.length > 0 ? "#4CAF50" : colors.muted }}>
                {selectedDates.length > 0 ? "Active" : "No dates selected"}
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={() => {}}>
          <Text style={styles.saveButtonText}>💾 Save Availability</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
