import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function CreateShiftScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceType: "companion" as const,
    location: "",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    hourlyRate: "25",
    requiredExperience: "0",
    maxCaregivers: "1",
  });

  const createMutation = trpc.shifts.create.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Shift created successfully!");
      router.back();
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to create shift");
    },
  });

  const handleCreate = async () => {
    if (!formData.title || !formData.location) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    await createMutation.mutateAsync({
      title: formData.title,
      description: formData.description || undefined,
      serviceType: formData.serviceType,
      location: formData.location,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      hourlyRate: parseFloat(formData.hourlyRate),
      requiredExperience: parseInt(formData.requiredExperience),
      maxCaregivers: parseInt(formData.maxCaregivers),
    });
  };

  const serviceTypes = [
    "companion",
    "personal_care",
    "household",
    "mobility_assistance",
  ];

  return (
    <ScreenContainer className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-primary font-semibold">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-foreground mb-6">
          Create New Shift
        </Text>

        {/* Title */}
        <View className="mb-4">
          <Text className="text-foreground font-semibold mb-2">
            Shift Title *
          </Text>
          <TextInput
            placeholder="e.g., Companion Care for Elderly"
            value={formData.title}
            onChangeText={(text) =>
              setFormData({ ...formData, title: text })
            }
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholderTextColor="#9BA1A6"
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-foreground font-semibold mb-2">
            Description
          </Text>
          <TextInput
            placeholder="Describe the shift duties and requirements"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            multiline
            numberOfLines={4}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholderTextColor="#9BA1A6"
          />
        </View>

        {/* Service Type */}
        <View className="mb-4">
          <Text className="text-foreground font-semibold mb-2">
            Service Type *
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {serviceTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() =>
                  setFormData({
                    ...formData,
                    serviceType: type as typeof formData.serviceType,
                  })
                }
                className={`px-4 py-2 rounded-lg border ${
                  formData.serviceType === type
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`font-semibold text-sm ${
                    formData.serviceType === type
                      ? "text-white"
                      : "text-foreground"
                  }`}
                >
                  {type.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View className="mb-4">
          <Text className="text-foreground font-semibold mb-2">
            Location *
          </Text>
          <TextInput
            placeholder="e.g., 123 Main St, Boston, MA"
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholderTextColor="#9BA1A6"
          />
        </View>

        {/* Hourly Rate */}
        <View className="mb-4">
          <Text className="text-foreground font-semibold mb-2">
            Hourly Rate ($) *
          </Text>
          <TextInput
            placeholder="25.00"
            value={formData.hourlyRate}
            onChangeText={(text) =>
              setFormData({ ...formData, hourlyRate: text })
            }
            keyboardType="decimal-pad"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholderTextColor="#9BA1A6"
          />
        </View>

        {/* Required Experience */}
        <View className="mb-4">
          <Text className="text-foreground font-semibold mb-2">
            Required Experience (years)
          </Text>
          <TextInput
            placeholder="0"
            value={formData.requiredExperience}
            onChangeText={(text) =>
              setFormData({ ...formData, requiredExperience: text })
            }
            keyboardType="number-pad"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholderTextColor="#9BA1A6"
          />
        </View>

        {/* Max Caregivers */}
        <View className="mb-6">
          <Text className="text-foreground font-semibold mb-2">
            Max Caregivers
          </Text>
          <TextInput
            placeholder="1"
            value={formData.maxCaregivers}
            onChangeText={(text) =>
              setFormData({ ...formData, maxCaregivers: text })
            }
            keyboardType="number-pad"
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholderTextColor="#9BA1A6"
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={createMutation.isPending}
          className="bg-primary px-6 py-4 rounded-lg mb-6"
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-center text-base">
              Create Shift
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
