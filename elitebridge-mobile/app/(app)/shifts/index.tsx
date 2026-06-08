import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface Shift {
  id: number;
  title: string;
  description: string;
  serviceType: string;
  location: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  status: string;
}

export default function ShiftsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch available shifts
  const { data: shifts = [], isLoading, refetch } = trpc.shifts.list.useQuery({
    limit: 50,
    offset: 0,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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

  const renderShiftCard = ({ item }: { item: Shift }) => (
    <TouchableOpacity
      onPress={() => router.push(`/shifts/${item.id}`)}
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
        <View className="bg-primary px-3 py-1 rounded-full">
          <Text className="text-white font-semibold text-sm">
            ${item.hourlyRate.toFixed(2)}/hr
          </Text>
        </View>
      </View>

      <Text className="text-sm text-muted mb-2">{item.location}</Text>

      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-muted">
          {formatDate(item.startTime)}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/shifts/${item.id}`)}
          className="bg-primary px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold text-sm">View Details</Text>
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

  return (
    <ScreenContainer className="flex-1">
      <View className="mb-4">
        <Text className="text-3xl font-bold text-foreground">Available Shifts</Text>
        <Text className="text-muted mt-1">
          {shifts.length} shifts available
        </Text>
      </View>

      {shifts.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted text-center">
            No shifts available at the moment. Check back soon!
          </Text>
        </View>
      ) : (
        <FlatList
          data={shifts}
          renderItem={renderShiftCard}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          scrollEnabled={false}
        />
      )}
    </ScreenContainer>
  );
}
