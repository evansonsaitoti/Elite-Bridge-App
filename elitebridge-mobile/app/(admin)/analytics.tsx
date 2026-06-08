import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Advanced Analytics - Reports and insights for admins
 */
export default function AnalyticsScreen() {
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState("month");

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
    periodSelector: {
      flexDirection: "row" as const,
      gap: 8,
      marginBottom: 12,
    },
    periodButton: (active: boolean) => ({
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: active ? colors.primary : colors.surface,
      borderWidth: 1,
      borderColor: active ? colors.primary : colors.border,
    }),
    periodButtonText: (active: boolean) => ({
      fontSize: 12,
      fontWeight: "bold" as const,
      color: active ? colors.background : colors.foreground,
    }),
    metricsGrid: {
      flexDirection: "row" as const,
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap" as const,
    },
    metricCard: {
      flex: 1,
      minWidth: 150 as any,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    metricValue: {
      fontSize: 24,
      fontWeight: "bold" as const,
      color: colors.primary,
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 11,
      color: colors.muted,
      textAlign: "center" as const,
    },
    chartContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    chartTitle: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 12,
    },
    chartBar: {
      marginBottom: 12,
    },
    chartBarLabel: {
      fontSize: 11,
      color: colors.muted,
      marginBottom: 4,
    },
    chartBarContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    chartBarFill: (percentage: number, color: string) => ({
      height: 24,
      backgroundColor: color,
      borderRadius: 4,
      width: `${Math.max(percentage, 5)}%` as any,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    }),
    chartBarValue: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: colors.background,
      paddingHorizontal: 4,
    },
    chartBarMax: {
      fontSize: 11,
      color: colors.muted,
      minWidth: 30 as any,
      textAlign: "right" as const,
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
    insightRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: "rgba(0,0,0,0.02)",
      borderRadius: 8,
      marginBottom: 8,
    },
    insightLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    insightValue: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    trendBadge: (trend: string) => ({
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: trend === "up" ? "#4CAF50" : "#FF9800",
    }),
    trendText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
    },
  };

  const metrics = [
    { label: "Avg. Utilization", value: "87%", color: colors.primary },
    { label: "Conversion Rate", value: "72%", color: "#4CAF50" },
    { label: "Shift Fill Rate", value: "94%", color: "#2196F3" },
    { label: "Staff Retention", value: "91%", color: "#FF9800" },
  ];

  const staffUtilization = [
    { name: "Sarah Johnson", percentage: 95, hours: 152 },
    { name: "Michael Chen", percentage: 88, hours: 140 },
    { name: "Emily Rodriguez", percentage: 92, hours: 147 },
    { name: "James Wilson", percentage: 78, hours: 125 },
  ];

  const applicationStats = [
    { name: "Caregiver", applications: 24, approved: 18, percentage: 75 },
    { name: "Activities Coordinator", applications: 16, approved: 11, percentage: 69 },
    { name: "Dining Services", applications: 12, approved: 10, percentage: 83 },
  ];

  const insights = [
    { label: "Peak Demand Day", value: "Tuesday", trend: "up" },
    { label: "Avg. Shift Duration", value: "7.2 hours", trend: "up" },
    { label: "Staff Satisfaction", value: "4.6/5.0", trend: "up" },
    { label: "No-Show Rate", value: "2.3%", trend: "down" },
  ];

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} scrollEnabled={true}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Platform insights and performance metrics</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={styles.periodButton(selectedPeriod === "week")}
            onPress={() => setSelectedPeriod("week")}
          >
            <Text style={styles.periodButtonText(selectedPeriod === "week")}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.periodButton(selectedPeriod === "month")}
            onPress={() => setSelectedPeriod("month")}
          >
            <Text style={styles.periodButtonText(selectedPeriod === "month")}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.periodButton(selectedPeriod === "year")}
            onPress={() => setSelectedPeriod("year")}
          >
            <Text style={styles.periodButtonText(selectedPeriod === "year")}>Year</Text>
          </TouchableOpacity>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric, idx) => (
            <View key={idx} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        {/* Staff Utilization Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>📊 Staff Utilization Rate</Text>
          {staffUtilization.map((staff, idx) => (
            <View key={idx} style={styles.chartBar}>
              <Text style={styles.chartBarLabel}>{staff.name}</Text>
              <View style={styles.chartBarContainer}>
                <View style={styles.chartBarFill(staff.percentage, "#45B7D1")}>
                  {staff.percentage > 40 && <Text style={styles.chartBarValue}>{staff.percentage}%</Text>}
                </View>
                <Text style={styles.chartBarMax}>{staff.hours}h</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Application Conversion Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>📈 Application Conversion Rate</Text>
          {applicationStats.map((app, idx) => (
            <View key={idx} style={styles.chartBar}>
              <Text style={styles.chartBarLabel}>
                {app.name} ({app.approved}/{app.applications})
              </Text>
              <View style={styles.chartBarContainer}>
                <View style={styles.chartBarFill(app.percentage, "#4CAF50")}>
                  {app.percentage > 40 && <Text style={styles.chartBarValue}>{app.percentage}%</Text>}
                </View>
                <Text style={styles.chartBarMax}>{app.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Key Insights */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#BB8FCE")}>
            <Text style={styles.sectionTitle}>💡 Key Insights</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            {insights.map((insight, idx) => (
              <View key={idx} style={styles.insightRow}>
                <Text style={styles.insightLabel}>{insight.label}</Text>
                <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 8 }}>
                  <Text style={styles.insightValue}>{insight.value}</Text>
                  <View style={styles.trendBadge(insight.trend)}>
                    <Text style={styles.trendText}>{insight.trend === "up" ? "↑" : "↓"}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Summary */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#FF6B6B")}>
            <Text style={styles.sectionTitle}>🎯 Performance Summary</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total Shifts Posted</Text>
              <Text style={styles.insightValue}>156</Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total Applications</Text>
              <Text style={styles.insightValue}>324</Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Active Staff Members</Text>
              <Text style={styles.insightValue}>87</Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total Hours Worked</Text>
              <Text style={styles.insightValue}>1,240h</Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total Payouts</Text>
              <Text style={styles.insightValue}>$18,240</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
