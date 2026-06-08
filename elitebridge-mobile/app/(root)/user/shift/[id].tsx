import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface ShiftDetail {
  id: number;
  title: string;
  serviceType: string;
  location: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  requiredExperience: number;
  description: string;
  maxCaregivers: number;
  status: string;
}

// Mock shift details
const MOCK_SHIFTS_DETAIL: Record<string, ShiftDetail> = {
  "1": {
    id: 1,
    title: "Companion Care - Boston",
    serviceType: "companion",
    location: "Boston Medical Center, Boston, MA 02118",
    startTime: "2026-05-24 09:00",
    endTime: "2026-05-24 17:00",
    hourlyRate: 22.5,
    requiredExperience: 1,
    description:
      "Friendly companion needed for elderly client. Light housekeeping and meal prep included. Client enjoys conversation, board games, and occasional outings. Must be comfortable with pets.",
    maxCaregivers: 1,
    status: "open",
  },
  "2": {
    id: 2,
    title: "Personal Care Assistant - Cambridge",
    serviceType: "personal_care",
    location: "Cambridge Senior Living, Cambridge, MA 02142",
    startTime: "2026-05-25 08:00",
    endTime: "2026-05-25 16:00",
    hourlyRate: 26.0,
    requiredExperience: 2,
    description:
      "Personal care assistance for client with mobility needs. Must be comfortable with physical assistance including bathing, dressing, and toileting. CPR certification preferred.",
    maxCaregivers: 1,
    status: "open",
  },
  "3": {
    id: 3,
    title: "Household Management - Worcester",
    serviceType: "household",
    location: "Worcester Care Facility, Worcester, MA 01608",
    startTime: "2026-05-26 10:00",
    endTime: "2026-05-26 14:00",
    hourlyRate: 20.0,
    requiredExperience: 0,
    description:
      "Help with household tasks, errands, and organization for busy professional. Tasks include light cleaning, grocery shopping, meal prep, and laundry.",
    maxCaregivers: 1,
    status: "open",
  },
  "4": {
    id: 4,
    title: "Mobility Assistance - Springfield",
    serviceType: "mobility_assistance",
    location: "Springfield Community Center, Springfield, MA 01103",
    startTime: "2026-05-27 11:00",
    endTime: "2026-05-27 15:00",
    hourlyRate: 24.0,
    requiredExperience: 1,
    description:
      "Assistance with mobility and transportation for senior client. Valid driver's license required. Must be comfortable with manual wheelchair assistance.",
    maxCaregivers: 1,
    status: "open",
  },
  "5": {
    id: 5,
    title: "Companion Care - Lowell (Weekend)",
    serviceType: "companion",
    location: "Lowell Assisted Living, Lowell, MA 01852",
    startTime: "2026-05-31 10:00",
    endTime: "2026-05-31 18:00",
    hourlyRate: 25.0,
    requiredExperience: 0,
    description: "Weekend companion care for active senior. Flexible hours available. Client enjoys outdoor activities and social events.",
    maxCaregivers: 2,
    status: "open",
  },
  "6": {
    id: 6,
    title: "Personal Care - Boston (Urgent)",
    serviceType: "personal_care",
    location: "Boston Medical Center, Boston, MA 02118",
    startTime: "2026-05-23 14:00",
    endTime: "2026-05-23 22:00",
    hourlyRate: 28.0,
    requiredExperience: 2,
    description:
      "Urgent need for personal care assistant. Immediate start possible. Client requires assistance with ADLs and medication management.",
    maxCaregivers: 1,
    status: "open",
  },
};

export default function ShiftDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [shift, setShift] = useState<ShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplied, setIsApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const shiftData = MOCK_SHIFTS_DETAIL[id as string];
      setShift(shiftData || null);
      setLoading(false);
    }, 300);
  }, [id]);

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      companion: "👤 Companion Care",
      personal_care: "🏥 Personal Care",
      household: "🏠 Household Management",
      mobility_assistance: "🚗 Mobility Assistance",
    };
    return labels[type] || type;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  if (loading) {
    return (
      <ScreenContainer className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!shift) {
    return (
      <ScreenContainer className="justify-center items-center">
        <Text className="text-foreground">Shift not found</Text>
      </ScreenContainer>
    );
  }

  const duration = calculateDuration(shift.startTime, shift.endTime);
  const totalEarnings = parseFloat(duration) * shift.hourlyRate;

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-4">
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} className="mb-4 active:opacity-70">
            <Text className="text-primary font-semibold">← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-6">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-sm text-muted mb-1">{getServiceTypeLabel(shift.serviceType)}</Text>
                <Text className="text-3xl font-bold text-foreground">{shift.title}</Text>
              </View>
              <View className="bg-primary rounded-full px-4 py-2">
                <Text className="text-white font-bold">${shift.hourlyRate.toFixed(2)}/hr</Text>
              </View>
            </View>
          </View>

          {/* Key Info Cards */}
          <View className="gap-3 mb-6">
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted font-semibold mb-1">📅 DATE & TIME</Text>
              <Text className="text-foreground font-semibold">{formatDateTime(shift.startTime)}</Text>
              <Text className="text-sm text-muted mt-1">Duration: {duration} hours</Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted font-semibold mb-1">📍 LOCATION</Text>
              <Text className="text-foreground font-semibold">{shift.location}</Text>
            </View>

            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted font-semibold mb-1">💰 ESTIMATED EARNINGS</Text>
              <Text className="text-2xl font-bold text-primary">${totalEarnings.toFixed(2)}</Text>
              <Text className="text-sm text-muted mt-1">for {duration} hours</Text>
            </View>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-2">About This Shift</Text>
            <Text className="text-foreground leading-relaxed">{shift.description}</Text>
          </View>

          {/* Requirements */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-3">Requirements</Text>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-primary" />
                <Text className="text-foreground">
                  {shift.requiredExperience > 0
                    ? `${shift.requiredExperience}+ years of experience`
                    : "No experience required"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-primary" />
                <Text className="text-foreground">Background check required</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-primary" />
                <Text className="text-foreground">Valid identification</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mb-6">
            <TouchableOpacity
              onPress={() => setIsApplied(!isApplied)}
              className={`py-3 rounded-lg items-center ${isApplied ? "bg-success" : "bg-primary"}`}
            >
              <Text className="text-white font-semibold text-base">
                {isApplied ? "✓ Application Submitted" : "Apply for This Shift"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSaved(!isSaved)}
              className="py-3 rounded-lg items-center border-2 border-primary"
            >
              <Text className="text-primary font-semibold text-base">{isSaved ? "💾 Saved" : "Save for Later"}</Text>
            </TouchableOpacity>
          </View>

          {/* Similar Shifts */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-3">Similar Opportunities</Text>
            <View className="bg-surface rounded-lg p-4 border border-border">
              <Text className="text-sm text-muted">
                Check back soon for more shifts matching your preferences
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
