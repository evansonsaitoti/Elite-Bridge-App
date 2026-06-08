import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Staff Earnings Dashboard - Shows completed shifts, earnings, and payout history
 */
export default function EarningsScreen() {
  const colors = useColors();
  const [expandedMonth, setExpandedMonth] = useState<string | null>("May 2026");

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
    earningsCard: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    earningsValue: {
      fontSize: 36,
      fontWeight: "bold" as const,
      color: colors.background,
      marginBottom: 4,
    },
    earningsLabel: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 12,
    },
    earningsRow: {
      flexDirection: "row" as const,
      justifyContent: "space-around" as const,
      width: "100%",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.3)",
    },
    earningsMetric: {
      alignItems: "center" as const,
    },
    earningsMetricValue: {
      fontSize: 16,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    earningsMetricLabel: {
      fontSize: 11,
      color: "rgba(255,255,255,0.7)",
      marginTop: 4,
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
    transactionRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: "rgba(0,0,0,0.02)",
      borderRadius: 8,
      marginBottom: 8,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    transactionSubtext: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    transactionAmount: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    shiftRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: "rgba(0,0,0,0.02)",
      borderRadius: 8,
      marginBottom: 8,
    },
    shiftInfo: {
      flex: 1,
    },
    shiftTitle: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    shiftDetails: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    shiftEarnings: {
      alignItems: "flex-end" as const,
    },
    shiftAmount: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    shiftHours: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    payoutStatus: (status: string) => ({
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: status === "Completed" ? "#4CAF50" : status === "Pending" ? "#FF9800" : "#2196F3",
    }),
    payoutStatusText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
    },
    emptyState: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 32,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: "center" as const,
    },
  };

  const completedShifts = [
    {
      id: "1",
      title: "Caregiver - Assisted Living",
      facility: "Sunrise Senior Living",
      date: "May 20, 2026",
      hours: 8,
      hourlyRate: 18,
      earnings: 144,
    },
    {
      id: "2",
      title: "Activities Coordinator",
      facility: "Golden Years Community",
      date: "May 18, 2026",
      hours: 6,
      hourlyRate: 16,
      earnings: 96,
    },
    {
      id: "3",
      title: "Dining Services Assistant",
      facility: "Meadowbrook Assisted Living",
      date: "May 15, 2026",
      hours: 8,
      hourlyRate: 17,
      earnings: 136,
    },
  ];

  const payoutHistory = [
    {
      id: "1",
      date: "May 15, 2026",
      amount: 376,
      status: "Completed",
      shifts: 3,
    },
    {
      id: "2",
      date: "May 8, 2026",
      amount: 432,
      status: "Completed",
      shifts: 4,
    },
    {
      id: "3",
      date: "May 1, 2026",
      amount: 504,
      status: "Completed",
      shifts: 5,
    },
  ];

  const totalEarnings = completedShifts.reduce((sum, shift) => sum + shift.earnings, 0);
  const totalHours = completedShifts.reduce((sum, shift) => sum + shift.hours, 0);
  const averageHourlyRate = (totalEarnings / totalHours).toFixed(2);

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} scrollEnabled={true}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Earnings</Text>
          <Text style={styles.headerSubtitle}>Track your income and payouts</Text>
        </View>

        {/* Total Earnings Card */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings This Month</Text>
          <Text style={styles.earningsValue}>${totalEarnings}</Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsMetric}>
              <Text style={styles.earningsMetricValue}>{totalHours}</Text>
              <Text style={styles.earningsMetricLabel}>Hours Worked</Text>
            </View>
            <View style={styles.earningsMetric}>
              <Text style={styles.earningsMetricValue}>${averageHourlyRate}</Text>
              <Text style={styles.earningsMetricLabel}>Avg. Hourly Rate</Text>
            </View>
            <View style={styles.earningsMetric}>
              <Text style={styles.earningsMetricValue}>{completedShifts.length}</Text>
              <Text style={styles.earningsMetricLabel}>Shifts Completed</Text>
            </View>
          </View>
        </View>

        {/* Completed Shifts Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#45B7D1")}>
            <Text style={styles.sectionTitle}>📋 Completed Shifts This Month</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            {completedShifts.length > 0 ? (
              completedShifts.map((shift) => (
                <View key={shift.id} style={styles.shiftRow}>
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftTitle}>{shift.title}</Text>
                    <Text style={styles.shiftDetails}>{shift.facility}</Text>
                    <Text style={styles.shiftDetails}>{shift.date} • {shift.hours}h @ ${shift.hourlyRate}/hr</Text>
                  </View>
                  <View style={styles.shiftEarnings}>
                    <Text style={styles.shiftAmount}>${shift.earnings}</Text>
                    <Text style={styles.shiftHours}>{shift.hours} hours</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No completed shifts yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payout History Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#BB8FCE")}>
            <Text style={styles.sectionTitle}>💳 Payout History</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            {payoutHistory.length > 0 ? (
              payoutHistory.map((payout) => (
                <View key={payout.id} style={styles.transactionRow}>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>Payout Processed</Text>
                    <Text style={styles.transactionSubtext}>{payout.date} • {payout.shifts} shifts</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" as const }}>
                    <Text style={styles.transactionAmount}>${payout.amount}</Text>
                    <View style={styles.payoutStatus(payout.status)}>
                      <Text style={styles.payoutStatusText}>{payout.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No payouts yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#FF6B6B")}>
            <Text style={styles.sectionTitle}>📊 Earnings Breakdown</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.transactionRow}>
              <Text style={styles.transactionTitle}>Total Earnings</Text>
              <Text style={styles.transactionAmount}>${totalEarnings}</Text>
            </View>
            <View style={styles.transactionRow}>
              <Text style={styles.transactionTitle}>Total Hours</Text>
              <Text style={styles.transactionAmount}>{totalHours}h</Text>
            </View>
            <View style={styles.transactionRow}>
              <Text style={styles.transactionTitle}>Average Hourly Rate</Text>
              <Text style={styles.transactionAmount}>${averageHourlyRate}/hr</Text>
            </View>
            <View style={styles.transactionRow}>
              <Text style={styles.transactionTitle}>Shifts Completed</Text>
              <Text style={styles.transactionAmount}>{completedShifts.length}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
