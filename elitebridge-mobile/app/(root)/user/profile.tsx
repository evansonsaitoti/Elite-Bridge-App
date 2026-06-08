import { ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  rating: number;
  totalRatings: number;
  completedShifts: number;
  backgroundCheck: "approved" | "pending" | "rejected";
  licenseNumber: string;
  licenseExpiry: string;
  joinDate: string;
}

const MOCK_PROFILE: UserProfile = {
  name: "Sarah Johnson",
  email: "sarah.johnson@example.com",
  phone: "(617) 555-0123",
  location: "Boston, MA",
  rating: 4.8,
  totalRatings: 24,
  completedShifts: 45,
  backgroundCheck: "approved",
  licenseNumber: "MA-CG-12345",
  licenseExpiry: "Dec 31, 2027",
  joinDate: "March 2024",
};

export default function UserProfileScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-4">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-3xl font-bold text-foreground">Profile</Text>
            </View>
            <TouchableOpacity className="bg-surface rounded-lg p-2 border border-border">
              <Text className="text-lg">⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View className="bg-surface rounded-lg p-6 border border-border mb-6 items-center">
            <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
              <Text className="text-4xl">👤</Text>
            </View>
            <Text className="text-2xl font-bold text-foreground">{MOCK_PROFILE.name}</Text>
            <Text className="text-sm text-muted mt-1">📍 {MOCK_PROFILE.location}</Text>

            {/* Rating */}
            <View className="flex-row items-center gap-2 mt-4">
              <Text className="text-2xl font-bold text-foreground">{MOCK_PROFILE.rating}</Text>
              <View className="flex-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} className="text-lg">
                    {star <= Math.floor(MOCK_PROFILE.rating) ? "⭐" : "☆"}
                  </Text>
                ))}
              </View>
              <Text className="text-sm text-muted">({MOCK_PROFILE.totalRatings})</Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row gap-2 mb-6">
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted">Completed</Text>
              <Text className="text-2xl font-bold text-foreground mt-2">{MOCK_PROFILE.completedShifts}</Text>
              <Text className="text-xs text-muted mt-1">shifts</Text>
            </View>
            <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
              <Text className="text-xs text-muted">Member Since</Text>
              <Text className="text-base font-bold text-foreground mt-2">{MOCK_PROFILE.joinDate}</Text>
            </View>
          </View>

          {/* Background Check Status */}
          <View className="bg-surface rounded-lg p-4 border border-border mb-6">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm text-muted">Background Check</Text>
                <Text className="text-lg font-bold text-foreground mt-1">
                  {MOCK_PROFILE.backgroundCheck === "approved"
                    ? "✓ Verified"
                    : MOCK_PROFILE.backgroundCheck === "pending"
                      ? "⏳ Pending"
                      : "✗ Not Approved"}
                </Text>
              </View>
              <Text className="text-2xl">
                {MOCK_PROFILE.backgroundCheck === "approved"
                  ? "✓"
                  : MOCK_PROFILE.backgroundCheck === "pending"
                    ? "⏳"
                    : "✗"}
              </Text>
            </View>
          </View>

          {/* Contact Information */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-3">Contact Information</Text>
            <View className="gap-3">
              <View className="bg-surface rounded-lg p-4 border border-border">
                <Text className="text-xs text-muted mb-1">Email</Text>
                <Text className="text-foreground font-semibold">{MOCK_PROFILE.email}</Text>
              </View>
              <View className="bg-surface rounded-lg p-4 border border-border">
                <Text className="text-xs text-muted mb-1">Phone</Text>
                <Text className="text-foreground font-semibold">{MOCK_PROFILE.phone}</Text>
              </View>
            </View>
          </View>

          {/* License Information */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-3">License Information</Text>
            <View className="bg-surface rounded-lg p-4 border border-border gap-3">
              <View>
                <Text className="text-xs text-muted mb-1">License Number</Text>
                <Text className="text-foreground font-semibold">{MOCK_PROFILE.licenseNumber}</Text>
              </View>
              <View className="pt-3 border-t border-border">
                <Text className="text-xs text-muted mb-1">Expiration Date</Text>
                <Text className="text-foreground font-semibold">{MOCK_PROFILE.licenseExpiry}</Text>
              </View>
            </View>
          </View>

          {/* Recent Reviews */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-3">Recent Reviews</Text>
            <View className="gap-3">
              <View className="bg-surface rounded-lg p-4 border border-border">
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="font-semibold text-foreground">Robert M.</Text>
                  <View className="flex-row gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text key={star} className="text-sm">
                        {star <= 5 ? "⭐" : "☆"}
                      </Text>
                    ))}
                  </View>
                </View>
                <Text className="text-sm text-muted">
                  "Sarah was absolutely wonderful! Very professional and caring. Highly recommend!"
                </Text>
              </View>

              <View className="bg-surface rounded-lg p-4 border border-border">
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="font-semibold text-foreground">Patricia L.</Text>
                  <View className="flex-row gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text key={star} className="text-sm">
                        {star <= 5 ? "⭐" : "☆"}
                      </Text>
                    ))}
                  </View>
                </View>
                <Text className="text-sm text-muted">
                  "Excellent care and attention to detail. Will book again."
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mb-6">
            <TouchableOpacity className="bg-primary rounded-lg py-3 items-center">
              <Text className="text-white font-semibold">Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity className="border border-primary rounded-lg py-3 items-center">
              <Text className="text-primary font-semibold">Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity className="border border-error rounded-lg py-3 items-center">
              <Text className="text-error font-semibold">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
