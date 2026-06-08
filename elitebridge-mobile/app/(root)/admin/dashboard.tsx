import { ScrollView, Text, View, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface AnalyticsCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
}

interface RecentActivity {
  id: number;
  type: "application" | "shift" | "hire";
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

const ANALYTICS: AnalyticsCard[] = [
  {
    title: "Pending Applications",
    value: 12,
    subtitle: "Awaiting review",
    icon: "📋",
    color: "#1B5E3F",
  },
  {
    title: "Open Shifts",
    value: 6,
    subtitle: "Active postings",
    icon: "📌",
    color: "#D97706",
  },
  {
    title: "Active Staff",
    value: 28,
    subtitle: "Available caregivers",
    icon: "👥",
    color: "#0891B2",
  },
  {
    title: "This Week's Revenue",
    value: "$4,280",
    subtitle: "From completed shifts",
    icon: "💰",
    color: "#7C3AED",
  },
];

const RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: 1,
    type: "application",
    title: "New Application",
    description: "Sarah Johnson applied for Companion Care - Boston",
    timestamp: "2 hours ago",
    icon: "📝",
  },
  {
    id: 2,
    type: "shift",
    title: "Shift Posted",
    description: "Personal Care Assistant - Cambridge (8 hours)",
    timestamp: "4 hours ago",
    icon: "📌",
  },
  {
    id: 3,
    type: "hire",
    title: "Staff Hired",
    description: "Michael Chen accepted Household Management shift",
    timestamp: "1 day ago",
    icon: "✅",
  },
  {
    id: 4,
    type: "application",
    title: "Application Approved",
    description: "Jessica Martinez approved for Mobility Assistance",
    timestamp: "2 days ago",
    icon: "✓",
  },
  {
    id: 5,
    type: "shift",
    title: "Shift Completed",
    description: "Personal Care - Boston (8 hours) completed successfully",
    timestamp: "3 days ago",
    icon: "🏁",
  },
];

export default function AdminDashboardScreen() {
  const colors = useColors();
  const router = useRouter();

  const renderAnalyticsCard = ({ item }: { item: AnalyticsCard }) => (
    <TouchableOpacity className="flex-1 bg-surface rounded-lg p-4 border border-border m-2 active:opacity-70">
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-3xl">{item.icon}</Text>
        <View className="bg-primary rounded-full px-2 py-1">
          <Text className="text-white text-xs font-semibold">↑ 12%</Text>
        </View>
      </View>
      <Text className="text-2xl font-bold text-foreground mb-1">{item.value}</Text>
      <Text className="text-xs text-muted">{item.title}</Text>
      <Text className="text-xs text-muted mt-1">{item.subtitle}</Text>
    </TouchableOpacity>
  );

  const renderActivityItem = ({ item }: { item: RecentActivity }) => (
    <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border mb-3 active:opacity-70">
      <View className="flex-row gap-3">
        <Text className="text-2xl">{item.icon}</Text>
        <View className="flex-1">
          <Text className="font-semibold text-foreground">{item.title}</Text>
          <Text className="text-sm text-muted mt-1">{item.description}</Text>
          <Text className="text-xs text-muted mt-2">{item.timestamp}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-4">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-foreground">Dashboard</Text>
            <Text className="text-sm text-muted mt-1">Welcome back, Robert</Text>
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-2 mb-6">
            <TouchableOpacity
              onPress={() => router.push("/(root)/admin/post-shift")}
              className="flex-1 bg-primary rounded-lg py-3 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold">+ Post Shift</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-surface border border-border rounded-lg py-3 items-center active:opacity-70">
              <Text className="text-foreground font-semibold">📊 Reports</Text>
            </TouchableOpacity>
          </View>

          {/* Analytics Grid */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-3">Key Metrics</Text>
            <FlatList
              data={ANALYTICS}
              renderItem={renderAnalyticsCard}
              keyExtractor={(item) => item.title}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{ justifyContent: "space-between" }}
            />
          </View>

          {/* Recent Activity */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-foreground">Recent Activity</Text>
              <TouchableOpacity>
                <Text className="text-primary font-semibold text-sm">View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={RECENT_ACTIVITY}
              renderItem={renderActivityItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>

          {/* Team Performance */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-3">Top Performers</Text>
            <View className="gap-3">
              <View className="bg-surface rounded-lg p-4 border border-border flex-row justify-between items-center">
                <View>
                  <Text className="font-semibold text-foreground">Sarah Johnson</Text>
                  <Text className="text-sm text-muted mt-1">45 shifts completed • ⭐ 4.8</Text>
                </View>
                <Text className="text-2xl">👤</Text>
              </View>
              <View className="bg-surface rounded-lg p-4 border border-border flex-row justify-between items-center">
                <View>
                  <Text className="font-semibold text-foreground">James Wilson</Text>
                  <Text className="text-sm text-muted mt-1">58 shifts completed • ⭐ 4.9</Text>
                </View>
                <Text className="text-2xl">👤</Text>
              </View>
              <View className="bg-surface rounded-lg p-4 border border-border flex-row justify-between items-center">
                <View>
                  <Text className="font-semibold text-foreground">Michael Chen</Text>
                  <Text className="text-sm text-muted mt-1">32 shifts completed • ⭐ 4.6</Text>
                </View>
                <Text className="text-2xl">👤</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
