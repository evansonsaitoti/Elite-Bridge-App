import { ScrollView, Text, View, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useState } from "react";
import { eliteBridgeApi } from "@/lib/elite-bridge-api";

/**
 * Admin Post Shift Screen - Create new shift opportunities
 */
export default function AdminPostShiftScreen() {
  const colors = useColors();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    serviceType: "Companionship",
    caregiverType: "Caregiver",
    recipientName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    date: "",
    startTime: "",
    endTime: "",
    payRate: "",
    requirements: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title || !formData.address || !formData.city || !formData.state || !formData.zipCode || !formData.date || !formData.startTime || !formData.endTime || !formData.payRate) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }
    const hourlyRate = Number(formData.payRate.replace(/[^0-9.]/g, ""));
    if (!hourlyRate) return Alert.alert("Invalid Rate", "Enter a valid hourly rate.");
    try {
      setSubmitting(true);
      await eliteBridgeApi.createShift({
        title: formData.title,
        serviceType: formData.serviceType,
        caregiverType: formData.caregiverType,
        careRecipientName: formData.recipientName || undefined,
        scheduleType: "one_time",
        startDate: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: { type: "client_home", address: formData.address, city: formData.city, state: formData.state.toUpperCase(), zipCode: formData.zipCode },
        pay: { hourlyRate, currency: "USD" },
        numberOfCaregivers: 1,
        requirements: formData.requirements.split("\n").map((item) => item.trim()).filter(Boolean),
        responsibilities: formData.description || formData.serviceType,
        notes: "",
        contact: { name: "Elite Bridge employer", phone: formData.phone || "Contact through Elite Bridge" },
        urgency: "standard",
      });
      Alert.alert("Shift Posted", `"${formData.title}" is now visible on web and mobile.`, [
      {
        text: "Post Another",
        onPress: () => {
          setFormData({
            title: "",
            serviceType: "Companionship",
            caregiverType: "Caregiver",
            recipientName: "",
            address: "",
            city: "",
            state: "",
            zipCode: "",
            phone: "",
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
    } catch (error) {
      Alert.alert("Could not post shift", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
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

          <View style={styles.formGroup}><Text style={styles.label}>Service type</Text><TextInput style={styles.input} value={formData.serviceType} onChangeText={(serviceType) => setFormData({ ...formData, serviceType })} /></View>
          <View style={styles.formGroup}><Text style={styles.label}>Care recipient first name</Text><TextInput style={styles.input} value={formData.recipientName} onChangeText={(recipientName) => setFormData({ ...formData, recipientName })} /></View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Street address <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Care location"
              placeholderTextColor={colors.muted}
              value={formData.address}
              onChangeText={(address) => setFormData({ ...formData, address })}
            />
          </View>
          <View style={styles.row}><TextInput style={[styles.input, styles.rowItem]} placeholder="City" value={formData.city} onChangeText={(city) => setFormData({ ...formData, city })} /><TextInput style={[styles.input, { width: 76 }]} placeholder="State" autoCapitalize="characters" maxLength={2} value={formData.state} onChangeText={(state) => setFormData({ ...formData, state })} /><TextInput style={[styles.input, { width: 104 }]} placeholder="ZIP" keyboardType="number-pad" value={formData.zipCode} onChangeText={(zipCode) => setFormData({ ...formData, zipCode })} /></View>

          {/* Date and Time */}
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.rowItem]}>
              <Text style={styles.label}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
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
                placeholder="08:00"
                placeholderTextColor={colors.muted}
                value={formData.startTime}
                onChangeText={(text) => setFormData({ ...formData, startTime: text })}
              />
            </View>
            <View style={[styles.formGroup, styles.rowItem]}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                placeholder="16:00"
                placeholderTextColor={colors.muted}
                value={formData.endTime}
                onChangeText={(text) => setFormData({ ...formData, endTime: text })}
              />
            </View>
          </View>
          <View style={styles.formGroup}><Text style={styles.label}>Contact phone</Text><TextInput style={styles.input} keyboardType="phone-pad" value={formData.phone} onChangeText={(phone) => setFormData({ ...formData, phone })} /></View>

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
          <Pressable style={[styles.submitButton, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitButtonText}>{submitting ? "Posting…" : "Post Shift"}</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
