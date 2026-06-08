import { ScrollView, Text, View, TouchableOpacity, FlatList, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface Application {
  id: number;
  candidateName: string;
  shiftTitle: string;
  appliedDate: string;
  status: "pending" | "approved" | "rejected";
  rating: number;
  completedShifts: number;
  backgroundCheck: "approved" | "pending" | "rejected";
}

const MOCK_APPLICATIONS: Application[] = [
  {
    id: 1,
    candidateName: "Sarah Johnson",
    shiftTitle: "Companion Care - Boston",
    appliedDate: "2 hours ago",
    status: "pending",
    rating: 4.8,
    completedShifts: 45,
    backgroundCheck: "approved",
  },
  {
    id: 2,
    candidateName: "Michael Chen",
    shiftTitle: "Companion Care - Boston",
    appliedDate: "5 hours ago",
    status: "approved",
    rating: 4.6,
    completedShifts: 32,
    backgroundCheck: "approved",
  },
  {
    id: 3,
    candidateName: "Jessica Martinez",
    shiftTitle: "Personal Care Assistant - Cambridge",
    appliedDate: "1 day ago",
    status: "pending",
    rating: 0,
    completedShifts: 0,
    backgroundCheck: "pending",
  },
  {
    id: 4,
    candidateName: "David Thompson",
    shiftTitle: "Household Management - Worcester",
    appliedDate: "2 days ago",
    status: "approved",
    rating: 4.7,
    completedShifts: 28,
    backgroundCheck: "approved",
  },
  {
    id: 5,
    candidateName: "Emily Rodriguez",
    shiftTitle: "Mobility Assistance - Springfield",
    appliedDate: "3 days ago",
    status: "rejected",
    rating: 0,
    completedShifts: 0,
    backgroundCheck: "rejected",
  },
];

export default function AdminApplicationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const filteredApplications =
    filter === "all" ? applications : applications.filter((app) => app.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#22C55E";
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

  const handleApprove = (id: number) => {
    setApplications(
      applications.map((app) =>
        app.id === id ? { ...app, status: "approved" as const } : app
      )
    );
    Alert.alert("Success", "Application approved!");
  };

  const handleReject = (id: number) => {
    Alert.prompt(
      "Reject Application",
      "Please provide a reason for rejection:",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Reject",
          onPress: () => {
            setApplications(
              applications.map((app) =>
                app.id === id ? { ...app, status: "rejected" as const } : app
              )
            );
            Alert.alert("Success", "Application rejected!");
          },
        },
      ],
      "plain-text"
    );
  };

  const renderApplicationCard = ({ item }: { item: Application }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(root)/admin/application/${item.id}`)}
      className="bg-surface rounded-lg p-4 border border-border mb-3 active:opacity-70"
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{item.candidateName}</Text>
          <Text className="text-sm text-muted mt-1">{item.shiftTitle}</Text>
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

      {/* Stats */}
      <View className="flex-row gap-4 mb-4 py-3 border-t border-b border-border">
        <View>
          <Text className="text-xs text-muted">Rating</Text>
          <Text className="text-sm font-bold text-foreground mt-1">
            {item.rating > 0 ? `⭐ ${item.rating}` : "New"}
          </Text>
        </View>
        <View>
          <Text className="text-xs text-muted">Completed</Text>
          <Text className="text-sm font-bold text-foreground mt-1">{item.completedShifts} shifts</Text>
        </View>
        <View>
          <Text className="text-xs text-muted">Background</Text>
          <Text
            className="text-sm font-bold mt-1"
            style={{
              color:
                item.backgroundCheck === "approved"
                  ? "#22C55E"
                  : item.backgroundCheck === "rejected"
                    ? "#EF4444"
                    : "#F59E0B",
            }}
          >
            {item.backgroundCheck === "approved"
              ? "✓ Clear"
              : item.backgroundCheck === "rejected"
                ? "✗ Failed"
                : "⏳ Pending"}
          </Text>
        </View>
      </View>

      {/* Applied Date */}
      <Text className="text-xs text-muted mb-3">Applied {item.appliedDate}</Text>

      {/* Action Buttons */}
      {item.status === "pending" && (
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => handleApprove(item.id)}
            className="flex-1 bg-success rounded-lg py-2 items-center"
          >
            <Text className="text-white font-semibold text-sm">Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleReject(item.id)}
            className="flex-1 bg-error rounded-lg py-2 items-center"
          >
            <Text className="text-white font-semibold text-sm">Reject</Text>
          </TouchableOpacity>
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
            <Text className="text-3xl font-bold text-foreground">Applications</Text>
            <Text className="text-sm text-muted mt-1">
              {filteredApplications.length} {filter === "all" ? "total" : filter} applications
            </Text>
          </View>

          {/* Filter Tabs */}
          <View className="flex-row gap-2 mb-6 pb-3 border-b border-border">
            {["all", "pending", "approved", "rejected"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab as any)}
                className={`px-4 py-2 rounded-lg ${filter === tab ? "bg-primary" : "bg-surface border border-border"}`}
              >
                <Text
                  className={`font-semibold text-sm ${filter === tab ? "text-white" : "text-foreground"}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Applications List */}
          {filteredApplications.length > 0 ? (
            <FlatList
              data={filteredApplications}
              renderItem={renderApplicationCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View className="items-center justify-center py-12">
              <Text className="text-muted text-lg">No {filter === "all" ? "" : filter} applications</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
