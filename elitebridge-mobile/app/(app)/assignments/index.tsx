import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface Assignment {
  id: number;
  shiftId: number;
  title: string;
  serviceType: string;
  location: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  status: "pending" | "accepted" | "in_progress" | "completed";
}

export default function AssignmentsScreen() {
  const router = useRouter();

  // Fetch accepted offers (assignments)
  const { data: offers = [], isLoading } = trpc.offers.listPending.useQuery();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatServiceType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/20 text-success";
      case "in_progress":
        return "bg-warning/20 text-warning";
      case "accepted":
        return "bg-primary/20 text-primary";
      default:
        return "bg-muted/20 text-muted";
    }
  };

  const renderAssignmentCard = ({ item }: { item: Assignment }) => (
    <TouchableOpacity
      onPress={() => router.push(`/shifts/${item.shiftId}`)}
      className="bg-surface rounded-lg p-4 mb-3 border border-border"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">
            {item.title}
          </Text>
          <Text className="text-sm text-muted mt-1">
            {formatServiceType(item.serviceType)}
          </Text>
        </View>
        <View className={cn("px-3 py-1 rounded-full", getStatusColor(item.status))}>
          <Text className="text-xs font-semibold capitalize">
            {item.status.replace(/_/g, " ")}
          </Text>
        </View>
      </View>

      <Text className="text-sm text-muted mb-2">{item.location}</Text>

      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-xs text-muted">
            {formatDate(item.startTime)}
          </Text>
          <Text className="text-sm font-semibold text-foreground mt-1">
            ${item.hourlyRate.toFixed(2)}/hr
          </Text>
        </View>
        <TouchableOpacity className="bg-primary px-4 py-2 rounded-lg">
          <Text className="text-white font-semibold text-sm">View</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ScreenContainer>
    );
  }

  const acceptedOffers = offers.filter((offer: any) => offer.status === "accepted");

  return (
    <ScreenContainer className="flex-1">
      <View className="mb-4">
        <Text className="text-3xl font-bold text-foreground">My Assignments</Text>
        <Text className="text-muted mt-1">
          {acceptedOffers.length} accepted shift{acceptedOffers.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {acceptedOffers.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted text-center mb-4">
            You haven't accepted any shifts yet.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/shifts")}
            className="bg-primary px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Browse Available Shifts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={acceptedOffers}
          renderItem={renderAssignmentCard}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      )}
    </ScreenContainer>
  );
}
