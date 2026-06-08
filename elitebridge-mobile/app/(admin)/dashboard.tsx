import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

/**
 * Admin Dashboard Screen - Overview and analytics
 * Phase 1: Placeholder with mock data
 */
export default function AdminDashboardScreen() {
  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Dashboard</Text>
            <Text className="text-sm text-muted">Manage your staffing operations</Text>
          </View>

          {/* Analytics Cards */}
          <View className="gap-3">
            {/* Pending Applications */}
            <View className="bg-surface rounded-lg p-4 border border-border">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm text-muted">Pending Applications</Text>
                  <Text className="text-3xl font-bold text-foreground mt-1">24</Text>
                </View>
                <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                  <Text className="text-2xl">📋</Text>
                </View>
              </View>
            </View>

            {/* Open Shifts */}
            <View className="bg-surface rounded-lg p-4 border border-border">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm text-muted">Open Shifts</Text>
                  <Text className="text-3xl font-bold text-foreground mt-1">8</Text>
                </View>
                <View className="w-12 h-12 rounded-full bg-success items-center justify-center">
                  <Text className="text-2xl">📅</Text>
                </View>
              </View>
            </View>

            {/* Staff Members */}
            <View className="bg-surface rounded-lg p-4 border border-border">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-sm text-muted">Staff Members</Text>
                  <Text className="text-3xl font-bold text-foreground mt-1">156</Text>
                </View>
                <View className="w-12 h-12 rounded-full bg-warning items-center justify-center">
                  <Text className="text-2xl">👥</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Quick Actions</Text>
            <TouchableOpacity className="bg-primary rounded-lg p-4 active:opacity-80">
              <Text className="text-background font-semibold text-center">+ Post New Shift</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
              <Text className="text-foreground font-semibold text-center">View All Applications</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border active:opacity-70">
              <Text className="text-foreground font-semibold text-center">Manage Staff</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Recent Activity</Text>
            <View className="bg-surface rounded-lg p-3 border border-border">
              <Text className="text-sm font-semibold text-foreground">Sarah Johnson applied for Warehouse shift</Text>
              <Text className="text-xs text-muted mt-1">2 hours ago</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 border border-border">
              <Text className="text-sm font-semibold text-foreground">New shift posted: Customer Service</Text>
              <Text className="text-xs text-muted mt-1">4 hours ago</Text>
            </View>
            <View className="bg-surface rounded-lg p-3 border border-border">
              <Text className="text-sm font-semibold text-foreground">Mike Chen completed background check</Text>
              <Text className="text-xs text-muted mt-1">1 day ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
