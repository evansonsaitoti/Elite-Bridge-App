import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * Staff Earnings Dashboard
 * Shows earnings history, completed shifts, and payment details
 */
export default function StaffEarnings() {
  const colors = useColors();
  const [expandedMonth, setExpandedMonth] = useState<string | null>("current");

  const totalEarnings = 1440;
  const hoursWorked = 90;
  const averageHourly = 16;

  const currentMonth = [
    {
      id: 1,
      date: "May 20, 2026",
      facility: "Sunrise Senior Living",
      hours: 8,
      hourlyRate: 18,
      earnings: 144,
      status: "Completed",
    },
    {
      id: 2,
      date: "May 18, 2026",
      facility: "Golden Years Community",
      hours: 8,
      hourlyRate: 16,
      earnings: 128,
      status: "Completed",
    },
    {
      id: 3,
      date: "May 15, 2026",
      facility: "Meadowbrook Assisted Living",
      hours: 8,
      hourlyRate: 17,
      earnings: 136,
      status: "Completed",
    },
  ];

  const previousMonth = [
    {
      id: 4,
      date: "April 28, 2026",
      facility: "Sunrise Senior Living",
      hours: 8,
      hourlyRate: 18,
      earnings: 144,
      status: "Paid",
    },
    {
      id: 5,
      date: "April 25, 2026",
      facility: "Golden Years Community",
      hours: 8,
      hourlyRate: 16,
      earnings: 128,
      status: "Paid",
    },
    {
      id: 6,
      date: "April 22, 2026",
      facility: "Meadowbrook Assisted Living",
      hours: 8,
      hourlyRate: 17,
      earnings: 136,
      status: "Paid",
    },
  ];

  const paymentMethods = [
    {
      id: 1,
      type: "Bank Account",
      last4: "4242",
      bank: "Chase Bank",
      status: "Active",
    },
  ];

  const renderStatCard = (label: string, value: string | number, color: string) => (
    <View
      style={{
        flex: 1,
        backgroundColor: color,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 6,
        marginBottom: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: "#fff", textAlign: "center" }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>
          Earnings
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Track your income and payments</Text>
      </View>

      {/* Total Earnings Card */}
      <View
        style={{
          backgroundColor: "#1B5E3F",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>
          Total Earnings
        </Text>
        <Text style={{ fontSize: 36, fontWeight: "bold", color: "#fff", marginBottom: 12 }}>
          ${totalEarnings}
        </Text>
        <View
          style={{
            flexDirection: "row" as const,
            justifyContent: "space-around" as const,
            width: "100%" as any,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.2)",
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>
              Hours Worked
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
              {hoursWorked}h
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>
              Avg. Hourly
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
              ${averageHourly}/hr
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={{ flexDirection: "row", marginBottom: 24, flexWrap: "wrap" }}>
        {renderStatCard("This Month", "$432", "#3498DB")}
        {renderStatCard("Pending", "$0", "#F7DC6F")}
      </View>

      {/* Payment Method */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          💳 Payment Method
        </Text>
        {paymentMethods.map((method) => (
          <View
            key={method.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderLeftWidth: 4,
              borderLeftColor: "#27AE60",
            }}
          >
            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                {method.type}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {method.bank} •••• {method.last4}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: "#27AE60",
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                {method.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Current Month Earnings */}
      <View style={{ marginBottom: 24 }}>
        <TouchableOpacity
          onPress={() => setExpandedMonth(expandedMonth === "current" ? null : "current")}
          style={{
            backgroundColor: "#FF6B6B",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
            📅 May 2026
          </Text>
          <Text style={{ fontSize: 18, color: "#fff" }}>
            {expandedMonth === "current" ? "▼" : "▶"}
          </Text>
        </TouchableOpacity>

        {expandedMonth === "current" && (
          <View>
            {currentMonth.map((shift) => (
              <View
                key={shift.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: "#1B5E3F",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                      {shift.facility}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {shift.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1B5E3F", marginBottom: 4 }}>
                      ${shift.earnings}
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#52BE80",
                        borderRadius: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "600", color: "#fff" }}>
                        {shift.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {shift.hours}h @ ${shift.hourlyRate}/hr
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Previous Month */}
      <View>
        <TouchableOpacity
          onPress={() => setExpandedMonth(expandedMonth === "previous" ? null : "previous")}
          style={{
            backgroundColor: "#4ECDC4",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
            📅 April 2026
          </Text>
          <Text style={{ fontSize: 18, color: "#fff" }}>
            {expandedMonth === "previous" ? "▼" : "▶"}
          </Text>
        </TouchableOpacity>

        {expandedMonth === "previous" && (
          <View>
            {previousMonth.map((shift) => (
              <View
                key={shift.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: "#1B5E3F",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                      {shift.facility}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {shift.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1B5E3F", marginBottom: 4 }}>
                      ${shift.earnings}
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#3498DB",
                        borderRadius: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "600", color: "#fff" }}>
                        {shift.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {shift.hours}h @ ${shift.hourlyRate}/hr
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
