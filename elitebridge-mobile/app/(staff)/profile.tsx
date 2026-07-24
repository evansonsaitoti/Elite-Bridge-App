import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";

/**
 * Staff Profile Screen
 * Shows personal information, background check status, and account settings
 */
export default function StaffProfile() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Logout",
        onPress: async () => {
          await logout();
          router.replace("/(tabs)/login");
        },
      },
    ]);
  };

  const profileStats = [
    { label: "Shifts Completed", value: "24" },
    { label: "Rating", value: "4.8" },
    { label: "Total Earnings", value: "$1,440" },
  ];

  const backgroundCheckStatus = {
    status: "Clear",
    date: "May 10, 2026",
    provider: "Checkr",
    expiresIn: "364 days",
  };

  const bankAccount = {
    bank: "Chase Bank",
    last4: "4242",
    status: "Active",
  };

  const renderStatCard = (label: string, value: string) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 6,
        marginBottom: 12,
        alignItems: "center",
        justifyContent: "center",
        borderLeftWidth: 4,
        borderLeftColor: "#1B5E3F",
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1B5E3F", marginBottom: 4 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );

  const renderSectionHeader = (title: string, icon: string, sectionKey: string) => (
    <TouchableOpacity
      onPress={() => setExpandedSection(expandedSection === sectionKey ? null : sectionKey)}
      style={{
        backgroundColor: "#1B5E3F",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
        {icon} {title}
      </Text>
      <Text style={{ fontSize: 18, color: "#fff" }}>
        {expandedSection === sectionKey ? "▼" : "▶"}
      </Text>
    </TouchableOpacity>
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
          Profile
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Manage your account</Text>
      </View>

      {/* User Info Card */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          borderLeftWidth: 4,
          borderLeftColor: "#1B5E3F",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>
          {user?.name || "Staff Member"}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 16 }}>
          {user?.email || "email@elitebridge.com"}
        </Text>
        <View
          style={{
            backgroundColor: "#E8F5E9",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#27AE60" }}>
            ✓ Verified
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={{ flexDirection: "row", marginBottom: 24, flexWrap: "wrap" }}>
        {profileStats.map((stat, index) => (
          <View key={index} style={{ width: "33.33%" }}>
            {renderStatCard(stat.label, stat.value)}
          </View>
        ))}
      </View>

      {/* Background Check Section */}
      {renderSectionHeader("Background Check", "🔒", "backgroundCheck")}
      {expandedSection === "backgroundCheck" && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: "#27AE60",
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
              Status
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#27AE60",
                }}
              />
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
                {backgroundCheckStatus.status}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
              Completed
            </Text>
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              {backgroundCheckStatus.date}
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
              Provider
            </Text>
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              {backgroundCheckStatus.provider}
            </Text>
          </View>

          <View
            style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
              Expires In
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#F7DC6F" }}>
              {backgroundCheckStatus.expiresIn}
            </Text>
          </View>
        </View>
      )}

      {/* Bank Account Section */}
      {renderSectionHeader("Bank Account", "💳", "bankAccount")}
      {expandedSection === "bankAccount" && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: "#3498DB",
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
              Bank
            </Text>
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              {bankAccount.bank}
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
              Account
            </Text>
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              •••• {bankAccount.last4}
            </Text>
          </View>

          <View
            style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <View
              style={{
                backgroundColor: "#27AE60",
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>
                {bankAccount.status}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Settings Section */}
      {renderSectionHeader("Settings", "⚙️", "settings")}
      {expandedSection === "settings" && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            gap: 12,
          }}
        >
          <TouchableOpacity
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              📱 Notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              🔐 Privacy & Security
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              ❓ Help & Support
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.foreground }}>
              📋 Terms & Conditions
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{
          backgroundColor: "#E74C3C",
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
          🚪 Logout
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
