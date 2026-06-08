import { ScrollView, Text, View, StyleSheet, Pressable, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";

/**
 * Caregiver Clock In/Out Screen - Track work hours
 */
export default function CaregiverClockScreen() {
  const colors = useColors();

  const [activeShift, setActiveShift] = useState<any>(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [clockHistory, setClockHistory] = useState([
    {
      id: 1,
      shiftTitle: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living",
      date: "May 20, 2026",
      clockInTime: "8:00 AM",
      clockOutTime: "4:30 PM",
      hoursWorked: 8.5,
      status: "completed",
    },
    {
      id: 2,
      shiftTitle: "Activities Coordinator",
      facility: "Golden Years Community",
      date: "May 19, 2026",
      clockInTime: "10:00 AM",
      clockOutTime: "6:00 PM",
      hoursWorked: 8,
      status: "completed",
    },
    {
      id: 3,
      shiftTitle: "Dining Services Assistant",
      facility: "Meadowbrook Assisted Living",
      date: "May 18, 2026",
      clockInTime: "9:00 AM",
      clockOutTime: "5:15 PM",
      hoursWorked: 8.25,
      status: "completed",
    },
  ]);

  // Mock available shifts
  const availableShifts = [
    {
      id: 1,
      title: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living - Maple Grove",
      date: "Today",
      time: "8:00 AM - 4:00 PM",
      status: "assigned",
    },
    {
      id: 2,
      title: "Activities Coordinator",
      facility: "Golden Years Community Center",
      date: "Tomorrow",
      time: "10:00 AM - 6:00 PM",
      status: "available",
    },
  ];

  // Update elapsed time every second
  useEffect(() => {
    if (!clockedIn || !clockInTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - clockInTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [clockedIn, clockInTime]);

  const handleClockIn = (shift: any) => {
    setActiveShift(shift);
    setClockedIn(true);
    setClockInTime(new Date());
    Alert.alert("Clocked In", `You have clocked in for ${shift.title}`);
  };

  const handleClockOut = () => {
    if (!activeShift || !clockInTime) return;

    const now = new Date();
    const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    const newRecord = {
      id: clockHistory.length + 1,
      shiftTitle: activeShift.title,
      facility: activeShift.facility,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      clockInTime: clockInTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      clockOutTime: now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      status: "completed",
    };

    setClockHistory([newRecord, ...clockHistory]);
    setClockedIn(false);
    setClockInTime(null);
    setElapsedTime("00:00:00");
    setActiveShift(null);

    Alert.alert("Clocked Out", `You worked ${newRecord.hoursWorked} hours`);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 20,
    },
    header: {
      gap: 8,
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
    clockCard: {
      backgroundColor: clockedIn ? colors.primary : colors.surface,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: clockedIn ? colors.primary : colors.border,
      alignItems: "center",
      gap: 16,
    },
    clockStatus: {
      fontSize: 16,
      fontWeight: "600",
      color: clockedIn ? colors.background : colors.muted,
    },
    clockTime: {
      fontSize: 48,
      fontWeight: "bold",
      color: clockedIn ? colors.background : colors.foreground,
      fontFamily: "monospace",
    },
    shiftInfo: {
      width: "100%",
      backgroundColor: clockedIn ? "rgba(255,255,255,0.1)" : colors.background,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    shiftTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: clockedIn ? colors.background : colors.foreground,
    },
    shiftFacility: {
      fontSize: 12,
      color: clockedIn ? "rgba(255,255,255,0.8)" : colors.muted,
    },
    clockButton: {
      width: "100%",
      backgroundColor: clockedIn ? colors.error : colors.success,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    clockButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.background,
    },
    shiftCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    shiftCardTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.foreground,
    },
    shiftCardFacility: {
      fontSize: 12,
      color: colors.muted,
    },
    shiftCardMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    shiftCardTime: {
      fontSize: 12,
      color: colors.muted,
    },
    shiftCardButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: "center",
    },
    shiftCardButtonText: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.background,
    },
    historyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    historyTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.foreground,
    },
    historyFacility: {
      fontSize: 12,
      color: colors.muted,
    },
    historyMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    historyTime: {
      fontSize: 12,
      color: colors.muted,
    },
    historyHours: {
      fontSize: 13,
      fontWeight: "bold",
      color: colors.primary,
    },
    historyDate: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 4,
    },
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Clock In/Out</Text>
            <Text style={styles.headerSubtitle}>Track your work hours</Text>
          </View>

          {/* Clock Card */}
          <View style={styles.section}>
            <View style={styles.clockCard}>
              <Text style={styles.clockStatus}>
                {clockedIn ? "Currently Clocked In" : "Clocked Out"}
              </Text>
              <Text style={styles.clockTime}>{elapsedTime}</Text>

              {clockedIn && activeShift && (
                <View style={styles.shiftInfo}>
                  <Text style={styles.shiftTitle}>{activeShift.title}</Text>
                  <Text style={styles.shiftFacility}>{activeShift.facility}</Text>
                </View>
              )}

              {clockedIn ? (
                <Pressable style={styles.clockButton} onPress={handleClockOut}>
                  <Text style={styles.clockButtonText}>Clock Out</Text>
                </Pressable>
              ) : (
                <Text style={styles.clockStatus}>Select a shift to clock in</Text>
              )}
            </View>
          </View>

          {/* Available Shifts */}
          {!clockedIn && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Shifts</Text>
              <FlatList
                data={availableShifts}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item: shift }) => (
                  <View style={[styles.shiftCard, { marginBottom: 12 }]}>
                    <Text style={styles.shiftCardTitle}>{shift.title}</Text>
                    <Text style={styles.shiftCardFacility}>{shift.facility}</Text>
                    <View style={styles.shiftCardMeta}>
                      <Text style={styles.shiftCardTime}>
                        {shift.date} • {shift.time}
                      </Text>
                      <Pressable
                        style={styles.shiftCardButton}
                        onPress={() => handleClockIn(shift)}
                      >
                        <Text style={styles.shiftCardButtonText}>Clock In</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          {/* Clock History */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Clock Records</Text>
            <FlatList
              data={clockHistory}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={[styles.historyCard, { marginBottom: 12 }]}>
                  <Text style={styles.historyTitle}>{item.shiftTitle}</Text>
                  <Text style={styles.historyFacility}>{item.facility}</Text>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyTime}>
                      {item.clockInTime} - {item.clockOutTime}
                    </Text>
                    <Text style={styles.historyHours}>{item.hoursWorked}h</Text>
                  </View>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
