import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type ServiceType = "companion" | "personal_care" | "household" | "mobility_assistance";

export default function PostShiftScreen() {
  const colors = useColors();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("companion");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [experience, setExperience] = useState("0");
  const [loading, setLoading] = useState(false);

  const serviceTypes: { value: ServiceType; label: string; icon: string }[] = [
    { value: "companion", label: "Companion Care", icon: "👤" },
    { value: "personal_care", label: "Personal Care", icon: "🏥" },
    { value: "household", label: "Household", icon: "🏠" },
    { value: "mobility_assistance", label: "Mobility", icon: "🚗" },
  ];

  const handleSubmit = async () => {
    if (!title || !description || !location || !date || !startTime || !endTime || !hourlyRate) {
      Alert.alert("Missing Fields", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert("Success", "Shift posted successfully!");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to post shift. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="px-4 py-4">
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} className="mb-4 active:opacity-70">
            <Text className="text-primary font-semibold">← Back</Text>
          </TouchableOpacity>

          <View className="mb-6">
            <Text className="text-3xl font-bold text-foreground">Post New Shift</Text>
            <Text className="text-sm text-muted mt-1">Fill in the details to create a new shift posting</Text>
          </View>

          {/* Basic Information */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">Basic Information</Text>

            {/* Title */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Shift Title *</Text>
              <TextInput
                placeholder="e.g., Companion Care - Boston"
                placeholderTextColor={colors.muted}
                value={title}
                onChangeText={setTitle}
                editable={!loading}
                className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Description *</Text>
              <TextInput
                placeholder="Describe the shift, duties, and any special requirements..."
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
                editable={!loading}
                multiline
                numberOfLines={4}
                className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
                style={{ textAlignVertical: "top" }}
              />
            </View>

            {/* Service Type */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Service Type *</Text>
              <View className="flex-row flex-wrap gap-2">
                {serviceTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setServiceType(type.value)}
                    className={`px-4 py-2 rounded-lg border-2 ${
                      serviceType === type.value ? "border-primary bg-primary" : "border-border bg-surface"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${serviceType === type.value ? "text-white" : "text-foreground"}`}
                    >
                      {type.icon} {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Location & Date/Time */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">Location & Schedule</Text>

            {/* Location */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Location *</Text>
              <TextInput
                placeholder="e.g., Boston Medical Center, Boston, MA"
                placeholderTextColor={colors.muted}
                value={location}
                onChangeText={setLocation}
                editable={!loading}
                className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
              />
            </View>

            {/* Date */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Date *</Text>
              <TextInput
                placeholder="MM/DD/YYYY"
                placeholderTextColor={colors.muted}
                value={date}
                onChangeText={setDate}
                editable={!loading}
                className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
              />
            </View>

            {/* Start & End Time */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">Start Time *</Text>
                <TextInput
                  placeholder="09:00 AM"
                  placeholderTextColor={colors.muted}
                  value={startTime}
                  onChangeText={setStartTime}
                  editable={!loading}
                  className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-2">End Time *</Text>
                <TextInput
                  placeholder="05:00 PM"
                  placeholderTextColor={colors.muted}
                  value={endTime}
                  onChangeText={setEndTime}
                  editable={!loading}
                  className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
                />
              </View>
            </View>
          </View>

          {/* Compensation & Requirements */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">Compensation & Requirements</Text>

            {/* Hourly Rate */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Hourly Rate ($) *</Text>
              <TextInput
                placeholder="25.00"
                placeholderTextColor={colors.muted}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                editable={!loading}
                keyboardType="decimal-pad"
                className="border border-border rounded-lg px-4 py-3 text-foreground bg-surface"
              />
            </View>

            {/* Experience Required */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Years of Experience Required</Text>
              <View className="flex-row gap-2">
                {["0", "1", "2", "3", "5"].map((year) => (
                  <TouchableOpacity
                    key={year}
                    onPress={() => setExperience(year)}
                    className={`px-4 py-2 rounded-lg border-2 ${
                      experience === year ? "border-primary bg-primary" : "border-border bg-surface"
                    }`}
                  >
                    <Text className={experience === year ? "text-white font-semibold" : "text-foreground font-semibold"}>
                      {year}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Background Check */}
            <View className="bg-surface rounded-lg p-4 border border-border mb-4">
              <View className="flex-row justify-between items-center">
                <Text className="font-semibold text-foreground">Background Check Required</Text>
                <TouchableOpacity className="w-12 h-6 bg-primary rounded-full items-center justify-center">
                  <View className="w-5 h-5 bg-white rounded-full" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mb-6">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-primary rounded-lg py-3 items-center"
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-white font-semibold text-base">Post Shift</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity className="border border-primary rounded-lg py-3 items-center">
              <Text className="text-primary font-semibold text-base">Save as Draft</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
