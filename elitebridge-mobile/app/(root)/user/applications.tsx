import { ScrollView, Text, View, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface UserApplication {
  id: number;
  shiftTitle: string;
  location: string;
  appliedDate: string;
  status: "pending" | "approved" | "rejected" | "accepted";
  hourlyRate: number;
  shiftDate: string;
}

const MOCK_USER_APPLICATIONS: UserApplication[] = [
  {
    id: 1,
    shiftTitle: "Companion Care - Boston",
    location: "Boston, MA",
    appliedDate: "2 hours ago",
    status: "approved",
    hourlyRate: 22.5,
    shiftDate: "May 24, 2026",
  },
  {
    id: 2,
    shiftTitle: "Personal Care Assistant - Cambridge",
    location: "Cambridge, MA",
    appliedDate: "5 hours ago",
    status: "pending",
    hourlyRate: 26.0,
    shiftDate: "May 25, 2026",
  },
  {
    id: 3,
    shiftTitle: "Household Management - Worcester",
    location: "Worcester, MA",
    appliedDate: "1 day ago",
    status: "accepted",
    hourlyRate: 20.0,
    shiftDate: "May 26, 2026",
  },
  {
    id: 4,
    shiftTitle: "Mobility Assistance - Springfield",
    location: "Springfield, MA",
    appliedDate: "3 days ago",
    status: "rejected",
    hourlyRate: 24.0,
    shiftDate: "May 27, 2026",
  },
];

export default function UserApplicationsScreen() {
  const colors = useColors();
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "#22C55E";
      case "approved":
        return "#0891B2";
      case "rejected":
        return "#EF4444";
      case "pending":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "✓ Accepted";
      case "approved":
        return "✓ Approved";
      case "rejected":
        return "✗ Rejected";
      case "pending":
        return "⏳ Pending";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return "🎉";
      case "approved":
        return "✓";
      case "rejected":
        return "✗";
      case "pending":
        return "⏳";
      default:
        return "•";
    }
  };

  const renderApplicationCard = ({ item }: { item: UserApplication }) => (
    <TouchableOpacity className="bg-surface rounded-lg p-4 border border-border mb-3 active:opacity-70">
      {/* Header */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{item.shiftTitle}</Text>
          <Text className="text-sm text-muted mt-1">📍 {item.location}</Text>
        </View>
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: getStatusColor(item.status) + "20" }}
        >
          <Text style={{ color: getStatusColor(item.status) }} className="font-semibold text-xs">
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View className="flex-row justify-between items-center py-3 border-t border-b border-border my-3">
        <View>
          <Text className="text-xs text-muted">Date</Text>
          <Text className="text-sm font-semibold text-foreground mt-1">{item.shiftDate}</Text>
        </View>
        <View>
          <Text className="text-xs text-muted">Rate</Text>
          <Text className="text-sm font-semibold text-primary mt-1">${item.hourlyRate.toFixed(2)}/hr</Text>
        </View>
        <View>
          <Text className="text-xs text-muted">Applied</Text>
          <Text className="text-sm font-semibold text-foreground mt-1">{item.appliedDate}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {item.status === "approved" && (
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity className="flex-1 bg-success rounded-lg py-2 items-center">
            <Text className="text-white font-semibold text-sm">Accept Offer</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 border border-error rounded-lg py-2 items-center">
            <Text className="text-error font-semibold text-sm">Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "accepted" && (
        <View className="bg-success bg-opacity-10 rounded-lg p-3 mt-3 border border-success">
          <Text className="text-success font-semibold text-sm">✓ Shift Confirmed</Text>
          <Text className="text-success text-xs mt-1">You're all set for this shift. Check your messages for details.</Text>
        </View>
      )}

      {item.status === "rejected" && (
        <View className="bg-error bg-opacity-10 rounded-lg p-3 mt-3 border border-error">
          <Text className="text-error font-semibold text-sm">Application Not Selected</Text>
          <Text className="text-error text-xs mt-1">Don't worry! Keep applying to find more opportunities.</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-4">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-foreground">My Applications</Text>
            <Text className="text-sm text-muted mt-1">{MOCK_USER_APPLICATIONS.length} applications submitted</Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-2 mb-6">
            <View className="flex-1 bg-surface rounded-lg p-3 border border-border">
              <Text className="text-xs text-muted">Pending</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">
                {MOCK_USER_APPLICATIONS.filter((a) => a.status === "pending").length}
              </Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-3 border border-border">
              <Text className="text-xs text-muted">Approved</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">
                {MOCK_USER_APPLICATIONS.filter((a) => a.status === "approved").length}
              </Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-3 border border-border">
              <Text className="text-xs text-muted">Accepted</Text>
              <Text className="text-2xl font-bold text-foreground mt-1">
                {MOCK_USER_APPLICATIONS.filter((a) => a.status === "accepted").length}
              </Text>
            </View>
          </View>

          {/* Applications List */}
          <FlatList
            data={MOCK_USER_APPLICATIONS}
            renderItem={renderApplicationCard}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
