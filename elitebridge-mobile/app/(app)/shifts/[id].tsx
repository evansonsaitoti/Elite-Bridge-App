import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);

  const shiftId = typeof id === "string" ? parseInt(id) : 0;

  const { data: shift, isLoading } = trpc.shifts.getById.useQuery({
    id: shiftId,
  });

  const { data: offers = [] } = trpc.offers.listPending.useQuery();
  const hasExistingOffer = offers.some((offer: any) => offer.shiftId === shiftId);

  const handleApply = async () => {
    Alert.alert(
      "Apply for Shift",
      "Are you sure you want to apply for this shift?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Apply",
          onPress: async () => {
            setIsApplying(true);
            try {
              // In a real app, this would create an offer
              Alert.alert("Success", "Your application has been submitted!");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to apply for shift");
            } finally {
              setIsApplying(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ScreenContainer>
    );
  }

  if (!shift) {
    return (
      <ScreenContainer className="flex-1 justify-center items-center">
        <Text className="text-muted">Shift not found</Text>
      </ScreenContainer>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = () => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  const hasApplied = offers.some((offer: any) => offer.shiftId === shiftId);

  return (
    <ScreenContainer className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-primary font-semibold">← Back</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-foreground mb-2">
            {shift.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <View className="bg-primary px-3 py-1 rounded-full">
              <Text className="text-white font-semibold text-sm">
                ${shift.hourlyRate.toFixed(2)}/hr
              </Text>
            </View>
            <View className="bg-surface px-3 py-1 rounded-full border border-border">
              <Text className="text-foreground text-sm font-medium">
                {calculateDuration()}h shift
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View className="bg-surface rounded-lg p-4 mb-4 border border-border">
          <View className="mb-4">
            <Text className="text-muted text-sm font-semibold mb-1">
              SERVICE TYPE
            </Text>
            <Text className="text-foreground text-base">
              {shift.serviceType.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-muted text-sm font-semibold mb-1">
              LOCATION
            </Text>
            <Text className="text-foreground text-base">{shift.location}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-muted text-sm font-semibold mb-1">
              DATE & TIME
            </Text>
            <Text className="text-foreground text-base">
              {formatDate(shift.startTime)}
            </Text>
            <Text className="text-foreground text-base">
              to {new Date(shift.endTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          <View>
            <Text className="text-muted text-sm font-semibold mb-1">
              REQUIRED EXPERIENCE
            </Text>
            <Text className="text-foreground text-base">
              {shift.requiredExperience} years
            </Text>
          </View>
        </View>

        {/* Description */}
        {shift.description && (
          <View className="mb-6">
            <Text className="text-foreground font-semibold mb-2">
              Description
            </Text>
            <Text className="text-muted leading-relaxed">
              {shift.description}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleApply}
          disabled={hasApplied || isApplying}
          className={cn(
            "py-4 px-6 rounded-lg mb-6",
            hasApplied
              ? "bg-surface border border-border"
              : "bg-primary"
          )}
        >
          {isApplying ? (
            <ActivityIndicator color={hasApplied ? "#687076" : "#ffffff"} />
          ) : (
            <Text
              className={cn(
                "text-center font-semibold text-base",
                hasApplied ? "text-muted" : "text-white"
              )}
            >
              {hasApplied ? "Already Applied" : "Apply for Shift"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
