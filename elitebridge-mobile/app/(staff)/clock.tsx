import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * Staff Clock In/Out Screen
 * Allows staff to clock in/out for shifts and track hours
 */
export default function StaffClock() {
  const colors = useColors();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [clockInTime, setClockInTime] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn]);

  const handleClockIn = () => {
    setIsClockedIn(true);
    const now = new Date();
    setClockInTime(now.toLocaleTimeString());
    setElapsedTime(0);
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const todayShifts = [
    {
      id: 1,
      facility: "Sunrise Senior Living",
      position: "Caregiver",
      scheduledStart: "8:00 AM",
      scheduledEnd: "4:00 PM",
      status: "In Progress",
    },
  ];

  const recentClocks = [
    {
      id: 1,
      date: "May 20, 2026",
      clockIn: "8:05 AM",
      clockOut: "4:15 PM",
      duration: "8h 10m",
      facility: "Sunrise Senior Living",
    },
    {
      id: 2,
      date: "May 18, 2026",
      clockIn: "10:00 AM",
      clockOut: "6:05 PM",
      duration: "8h 5m",
      facility: "Golden Years Community",
    },
    {
      id: 3,
      date: "May 15, 2026",
      clockIn: "9:00 AM",
      clockOut: "5:10 PM",
      duration: "8h 10m",
      facility: "Meadowbrook Assisted Living",
    },
  ];

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
          Time Tracking
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Clock in/out for your shifts</Text>
      </View>

      {/* Clock In/Out Card */}
      <View
        style={{
          backgroundColor: isClockedIn ? "#E74C3C" : "#1B5E3F",
          borderRadius: 16,
          padding: 32,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 16 }}>
          {isClockedIn ? "Currently Clocked In" : "Status: Clocked Out"}
        </Text>

        <Text style={{ fontSize: 48, fontWeight: "bold", color: "#fff", marginBottom: 24, fontFamily: "monospace" }}>
          {formatTime(elapsedTime)}
        </Text>

        {isClockedIn && clockInTime && (
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 24 }}>
            Clocked in at {clockInTime}
          </Text>
        )}

        <TouchableOpacity
          onPress={isClockedIn ? handleClockOut : handleClockIn}
          style={{
            backgroundColor: isClockedIn ? "#C0392B" : "#27AE60",
            borderRadius: 12,
            paddingHorizontal: 32,
            paddingVertical: 14,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
            {isClockedIn ? "Clock Out" : "Clock In"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Today's Shift */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          📅 Today's Shift
        </Text>
        {todayShifts.map((shift) => (
          <View
            key={shift.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              borderLeftWidth: 4,
              borderLeftColor: "#E74C3C",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
                  {shift.facility}
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>
                  {shift.position}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#E74C3C",
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                  {shift.status}
                </Text>
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
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {shift.scheduledStart} - {shift.scheduledEnd}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Clock Records */}
      <View>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          ⏱️ Recent Records
        </Text>
        {recentClocks.map((record) => (
          <View
            key={record.id}
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
                  {record.facility}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {record.date}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1B5E3F", marginBottom: 4 }}>
                  {record.duration}
                </Text>
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
                {record.clockIn} - {record.clockOut}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
