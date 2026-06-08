import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface ShiftOffer {
  id: number;
  shiftId: number;
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: string;
  offerMessage?: string;
}

export default function OffersScreen() {
  const router = useRouter();
  const [respondingTo, setRespondingTo] = useState<number | null>(null);

  const { data: offers = [], isLoading, refetch } = trpc.offers.listPending.useQuery();

  const acceptMutation = trpc.offers.accept.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Offer accepted!");
      refetch();
    },
    onError: () => {
      Alert.alert("Error", "Failed to accept offer");
    },
  });

  const declineMutation = trpc.offers.decline.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Offer declined");
      refetch();
    },
    onError: () => {
      Alert.alert("Error", "Failed to decline offer");
    },
  });

  const handleAccept = async (offerId: number) => {
    setRespondingTo(offerId);
    await acceptMutation.mutateAsync({ offerId });
    setRespondingTo(null);
  };

  const handleDecline = async (offerId: number) => {
    setRespondingTo(offerId);
    await declineMutation.mutateAsync({ offerId });
    setRespondingTo(null);
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatExpiresAt = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursLeft < 0) return "Expired";
    if (hoursLeft < 1) return "Expires in < 1 hour";
    if (hoursLeft === 1) return "Expires in 1 hour";
    if (hoursLeft < 24) return `Expires in ${hoursLeft} hours`;

    const daysLeft = Math.floor(hoursLeft / 24);
    return `Expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
  };

  const renderOfferCard = ({ item }: { item: ShiftOffer }) => {
    const expired = isExpired(item.expiresAt);

    return (
      <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground">
              Shift Offer #{item.id}
            </Text>
            <Text className="text-sm text-muted mt-1">
              {formatExpiresAt(item.expiresAt)}
            </Text>
          </View>
          <View
            className={cn(
              "px-3 py-1 rounded-full",
              expired
                ? "bg-error/20"
                : item.status === "accepted"
                  ? "bg-success/20"
                  : "bg-warning/20"
            )}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                expired
                  ? "text-error"
                  : item.status === "accepted"
                    ? "text-success"
                    : "text-warning"
              )}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {item.offerMessage && (
          <Text className="text-sm text-muted mb-3 italic">
            "{item.offerMessage}"
          </Text>
        )}

        {item.status === "pending" && !expired && (
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => handleAccept(item.id)}
              disabled={respondingTo === item.id}
              className="flex-1 bg-success px-4 py-3 rounded-lg"
            >
              {respondingTo === item.id ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-center">
                  Accept
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDecline(item.id)}
              disabled={respondingTo === item.id}
              className="flex-1 bg-error px-4 py-3 rounded-lg"
            >
              {respondingTo === item.id ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-center">
                  Decline
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

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
        <Text className="text-3xl font-bold text-foreground">Shift Offers</Text>
        <Text className="text-muted mt-1">
          {offers.length} pending offer{offers.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {offers.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted text-center">
            No pending offers at the moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOfferCard}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      )}
    </ScreenContainer>
  );
}
