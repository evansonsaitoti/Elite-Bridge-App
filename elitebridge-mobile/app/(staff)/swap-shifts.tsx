import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * Staff Shift Swap Marketplace
 * Allows staff to swap shifts with colleagues or pick up open shifts
 */
export default function StaffSwapShifts() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"swap" | "pickup">("swap");
  const [searchQuery, setSearchQuery] = useState("");

  const myShifts = [
    {
      id: 1,
      facility: "Sunrise Senior Living",
      date: "May 25, 2026",
      time: "8:00 AM - 4:00 PM",
      pay: "$144",
      status: "Available to Swap",
    },
    {
      id: 2,
      facility: "Golden Years Community",
      date: "May 27, 2026",
      time: "10:00 AM - 6:00 PM",
      pay: "$128",
      status: "Available to Swap",
    },
  ];

  const swapRequests = [
    {
      id: 1,
      fromStaff: "Maria Garcia",
      fromFacility: "Meadowbrook Assisted Living",
      fromDate: "May 23, 2026",
      fromTime: "9:00 AM - 5:00 PM",
      toFacility: "Sunrise Senior Living",
      toDate: "May 25, 2026",
      toTime: "8:00 AM - 4:00 PM",
      status: "Pending",
      rating: 4.8,
    },
    {
      id: 2,
      fromStaff: "James Chen",
      fromFacility: "Golden Years Community",
      fromDate: "May 22, 2026",
      fromTime: "10:00 AM - 6:00 PM",
      toFacility: "Meadowbrook Assisted Living",
      toDate: "May 28, 2026",
      toTime: "9:00 AM - 5:00 PM",
      status: "Pending",
      rating: 4.6,
    },
  ];

  const pickupShifts = [
    {
      id: 1,
      facility: "Sunrise Senior Living",
      date: "May 22, 2026",
      time: "8:00 AM - 4:00 PM",
      pay: "$144",
      reason: "Staff called out",
      urgency: "High",
    },
    {
      id: 2,
      facility: "Golden Years Community",
      date: "May 23, 2026",
      time: "10:00 AM - 6:00 PM",
      pay: "$128",
      reason: "Extra coverage needed",
      urgency: "Medium",
    },
    {
      id: 3,
      facility: "Meadowbrook Assisted Living",
      date: "May 24, 2026",
      time: "9:00 AM - 5:00 PM",
      pay: "$136",
      reason: "Increased demand",
      urgency: "Low",
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "High":
        return "#E74C3C";
      case "Medium":
        return "#F7DC6F";
      case "Low":
        return "#27AE60";
      default:
        return "#3498DB";
    }
  };

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
          Shift Marketplace
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Swap or pickup shifts</Text>
      </View>

      {/* Tab Navigation */}
      <View style={{ flexDirection: "row", marginBottom: 24, gap: 12 }}>
        <TouchableOpacity
          onPress={() => setActiveTab("swap")}
          style={{
            flex: 1,
            backgroundColor: activeTab === "swap" ? "#1B5E3F" : colors.surface,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: activeTab === "swap" ? "#fff" : colors.foreground,
            }}
          >
            🔄 Swap Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("pickup")}
          style={{
            flex: 1,
            backgroundColor: activeTab === "pickup" ? "#1B5E3F" : colors.surface,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: activeTab === "pickup" ? "#fff" : colors.foreground,
            }}
          >
            ⬆️ Pickup Shifts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ marginBottom: 20 }}>
        <TextInput
          placeholder={activeTab === "swap" ? "Search by staff name..." : "Search by facility..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            color: colors.foreground,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          placeholderTextColor={colors.muted}
        />
      </View>

      {/* Swap Requests Tab */}
      {activeTab === "swap" && (
        <View>
          {/* My Shifts Available to Swap */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
              📅 My Shifts Available to Swap
            </Text>
            {myShifts.map((shift) => (
              <View
                key={shift.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: "#3498DB",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                      {shift.facility}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {shift.date}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "#3498DB",
                      borderRadius: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                      {shift.pay}
                    </Text>
                  </View>
                </View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    {shift.time}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#1B5E3F",
                    borderRadius: 6,
                    paddingVertical: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                    Offer to Swap
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Swap Requests from Others */}
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
              🔄 Swap Requests from Others
            </Text>
            {swapRequests.map((request) => (
              <View
                key={request.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: "#F7DC6F",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                      {request.fromStaff}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ fontSize: 12, color: "#F7DC6F" }}>⭐ {request.rating}</Text>
                    </View>
                  </View>
                  <View
                    style={{
                      backgroundColor: "#F7DC6F",
                      borderRadius: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#000" }}>
                      {request.status}
                    </Text>
                  </View>
                </View>

                <View style={{ backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
                    Their Shift:
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                    {request.fromFacility}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {request.fromDate} • {request.fromTime}
                  </Text>
                </View>

                <View style={{ backgroundColor: "rgba(27,94,63,0.1)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
                    Your Shift:
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                    {request.toFacility}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {request.toDate} • {request.toTime}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#27AE60",
                      borderRadius: 6,
                      paddingVertical: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                      Accept
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: colors.border,
                      borderRadius: 6,
                      paddingVertical: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Pickup Shifts Tab */}
      {activeTab === "pickup" && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
            ⬆️ Available Shifts to Pickup
          </Text>
          {pickupShifts.map((shift) => (
            <View
              key={shift.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getUrgencyColor(shift.urgency),
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                    {shift.facility}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                    {shift.date}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {shift.reason}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      backgroundColor: getUrgencyColor(shift.urgency),
                      borderRadius: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                      {shift.urgency}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1B5E3F" }}>
                    {shift.pay}
                  </Text>
                </View>
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {shift.time}
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: "#1B5E3F",
                  borderRadius: 6,
                  paddingVertical: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                  Pickup Shift
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
