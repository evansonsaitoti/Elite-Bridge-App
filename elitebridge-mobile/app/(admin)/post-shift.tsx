import { ScrollView, Text, View, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useState } from "react";

/**
 * Admin Post Shift Screen - Create new shift opportunities
 */
export default function AdminPostShiftScreen() {
  const colors = useColors();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    payRate: "",
    requirements: "",
    description: "",
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.location || !formData.date || !formData.payRate) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    Alert.alert("Shift Posted", `"${formData.title}" has been posted successfully!`, [
      {
        text: "Post Another",
        onPress: () => {
          setFormData({
            title: "",
            location: "",
            date: "",
            startTime: "",
            endTime: "",
            payRate: "",
            requirements: "",
            description: "",
          });
        },
      },
      {
        text: "Back to Dashboard",
        onPress: () => router.back(),
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 20,
    },
    header: {
      gap: 8,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    formGroup: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
    },
    required: {
      color: colors.error,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    rowItem: {
      flex: 1,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.background,
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.foreground,
    },
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Post New Shift</Text>
            <Text style={styles.headerSubtitle}>Create an opportunity for caregivers</Text>
          </View>

          {/* Position Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Position Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Caregiver, Activities Coordinator"
              placeholderTextColor={colors.muted}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Facility Location <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sunrise Senior Living - Maple Grove"
              placeholderTextColor={colors.muted}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>

          {/* Date and Time */}
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.rowItem]}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={colors.muted}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
              />
            </View>
          </View>

          {/* Time Range */}
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.rowItem]}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                placeholder="8:00 AM"
                placeholderTextColor={colors.muted}
                value={formData.startTime}
                onChangeText={(text) => setFormData({ ...formData, startTime: text })}
              />
            </View>
            <View style={[styles.formGroup, styles.rowItem]}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                placeholder="4:00 PM"
                placeholderTextColor={colors.muted}
                value={formData.endTime}
                onChangeText={(text) => setFormData({ ...formData, endTime: text })}
              />
            </View>
          </View>

          {/* Pay Rate */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Hourly Rate <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., $18/hr"
              placeholderTextColor={colors.muted}
              value={formData.payRate}
              onChangeText={(text) => setFormData({ ...formData, payRate: text })}
            />
          </View>

          {/* Requirements */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Key Requirements</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List key requirements (one per line)"
              placeholderTextColor={colors.muted}
              multiline
              value={formData.requirements}
              onChangeText={(text) => setFormData({ ...formData, requirements: text })}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Job Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the role and responsibilities"
              placeholderTextColor={colors.muted}
              multiline
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
          </View>

          {/* Buttons */}
          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Post Shift</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
