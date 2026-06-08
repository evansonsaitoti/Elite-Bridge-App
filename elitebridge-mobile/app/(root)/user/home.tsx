import { ScrollView, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface Shift {
  id: number;
  title: string;
  serviceType: string;
  location: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  requiredExperience: number;
  status: string;
}

// Mock shifts data
const MOCK_SHIFTS: Shift[] = [
  {
    id: 1,
    title: "Companion Care - Boston",
    serviceType: "companion",
    location: "Boston, MA",
    startTime: "2026-05-24 09:00",
    endTime: "2026-05-24 17:00",
    hourlyRate: 22.5,
    requiredExperience: 1,
    status: "open",
  },
  {
    id: 2,
    title: "Personal Care Assistant - Cambridge",
    serviceType: "personal_care",
    location: "Cambridge, MA",
    startTime: "2026-05-25 08:00",
    endTime: "2026-05-25 16:00",
    hourlyRate: 26.0,
    requiredExperience: 2,
    status: "open",
  },
  {
    id: 3,
    title: "Household Management - Worcester",
    serviceType: "household",
    location: "Worcester, MA",
    startTime: "2026-05-26 10:00",
    endTime: "2026-05-26 14:00",
    hourlyRate: 20.0,
    requiredExperience: 0,
    status: "open",
  },
  {
    id: 4,
    title: "Mobility Assistance - Springfield",
    serviceType: "mobility_assistance",
    location: "Springfield, MA",
    startTime: "2026-05-27 11:00",
    endTime: "2026-05-27 15:00",
    hourlyRate: 24.0,
    requiredExperience: 1,
    status: "open",
  },
  {
    id: 5,
    title: "Companion Care - Lowell (Weekend)",
    serviceType: "companion",
    location: "Lowell, MA",
    startTime: "2026-05-31 10:00",
    endTime: "2026-05-31 18:00",
    hourlyRate: 25.0,
    requiredExperience: 0,
    status: "open",
  },
  {
    id: 6,
    title: "Personal Care - Boston (Urgent)",
    serviceType: "personal_care",
    location: "Boston, MA",
    startTime: "2026-05-23 14:00",
    endTime: "2026-05-23 22:00",
    hourlyRate: 28.0,
    requiredExperience: 2,
    status: "open",
  },
];

export default function UserHomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "saved">("all");

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setShifts(MOCK_SHIFTS);
      setLoading(false);
    }, 500);
  }, []);

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      companion: "👤 Companion",
      personal_care: "🏥 Personal Care",
      household: "🏠 Household",
      mobility_assistance: "🚗 Mobility",
    };
    return labels[type] || type;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const renderShiftCard = ({ item }: { item: Shift }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(root)/user/shift/${item.id}`)}
      className="mb-4 bg-surface rounded-lg p-4 border border-border active:opacity-70"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{item.title}</Text>
          <Text className="text-sm text-muted mt-1">{getServiceTypeLabel(item.serviceType)}</Text>
        </View>
        <View className="bg-primary rounded-full px-3 py-1">
          <Text className="text-white font-bold text-sm">${item.hourlyRate.toFixed(2)}/hr</Text>
        </View>
      </View>

      <View className="gap-2 mt-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-muted">📍</Text>
          <Text className="text-sm text-foreground">{item.location}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-muted">🕐</Text>
          <Text className="text-sm text-foreground">{formatTime(item.startTime)}</Text>
        </View>
        {item.requiredExperience > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-muted">📋</Text>
            <Text className="text-sm text-muted">{item.requiredExperience}+ years experience</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2 mt-4">
        <TouchableOpacity className="flex-1 bg-primary rounded-lg py-2 items-center">
          <Text className="text-white font-semibold">Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity className="px-4 py-2 border border-primary rounded-lg items-center">
          <Text className="text-primary">💾</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenContainer className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="px-4 py-4">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-foreground">Available Shifts</Text>
            <Text className="text-sm text-muted mt-1">{shifts.length} opportunities nearby</Text>
          </View>

          {/* Filter Tabs */}
          <View className="flex-row gap-2 mb-6">
            <TouchableOpacity
              onPress={() => setFilter("all")}
              className={`flex-1 py-2 rounded-lg items-center border ${
                filter === "all" ? "bg-primary border-primary" : "border-border"
              }`}
            >
              <Text className={filter === "all" ? "text-white font-semibold" : "text-foreground font-semibold"}>
                All Shifts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter("saved")}
              className={`flex-1 py-2 rounded-lg items-center border ${
                filter === "saved" ? "bg-primary border-primary" : "border-border"
              }`}
            >
              <Text className={filter === "saved" ? "text-white font-semibold" : "text-foreground font-semibold"}>
                Saved
              </Text>
            </TouchableOpacity>
          </View>

          {/* Shifts List */}
          <FlatList
            data={shifts}
            renderItem={renderShiftCard}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
