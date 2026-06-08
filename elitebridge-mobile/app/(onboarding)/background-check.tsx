import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";

/**
 * Onboarding Step 3: Background Check Submission
 * Submits background check request via Checkr API
 */
export default function OnboardingBackgroundCheck() {
  const colors = useColors();
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [hasConsented, setHasConsented] = useState(data.backgroundCheckConsent);

  const requiredDocuments = [
    "Valid government-issued ID (Driver's License, Passport, or State ID)",
    "Social Security Number",
    "Current address verification",
    "Employment history for past 7 years",
  ];

  const handleSubmitBackgroundCheck = async () => {
    if (!hasConsented) {
      Alert.alert("Consent Required", "Please agree to the background check consent form");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate Checkr API call
      // In production, this would call the backend which integrates with Checkr
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock response
      const candidateId = `checkr_${Date.now()}`;

      updateData({
        backgroundCheckConsent: true,
        backgroundCheckStatus: "submitted",
        checkrCandidateId: candidateId,
      });

      Alert.alert(
        "Background Check Submitted",
        "Your background check has been submitted to Checkr. You'll receive updates via email. You can proceed to set up your bank account in the meantime.",
        [
          {
            text: "Continue",
            onPress: () => {
              nextStep();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to submit background check. Please try again.");
      updateData({
        backgroundCheckStatus: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderChecklistItem = (item: string, index: number) => (
    <View
      key={index}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: "#27AE60",
      }}
    >
      <Text style={{ fontSize: 18, marginRight: 12, color: "#27AE60" }}>✓</Text>
      <Text style={{ fontSize: 14, color: colors.foreground, flex: 1, lineHeight: 20 }}>
        {item}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Progress Bar */}
      <View style={{ marginBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
            Step 3 of 5
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>60% Complete</Text>
        </View>
        <View
          style={{
            height: 6,
            backgroundColor: colors.surface,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 6,
              width: "60%",
              backgroundColor: "#1B5E3F",
            }}
          />
        </View>
      </View>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
          Background Check
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
          All staff members must complete a background check through Checkr before their first shift.
        </Text>
      </View>

      {/* Info Card */}
      <View
        style={{
          backgroundColor: "rgba(27,94,63,0.1)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderLeftWidth: 4,
          borderLeftColor: "#1B5E3F",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 8 }}>
          ℹ️ What to Expect
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>
          Checkr will verify your identity, employment history, and conduct a comprehensive background check. The process typically takes 3-5 business days.
        </Text>
      </View>

      {/* Required Documents */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          📋 Required Documents
        </Text>
        {requiredDocuments.map((doc, index) => renderChecklistItem(doc, index))}
      </View>

      {/* Consent Checkbox */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: hasConsented ? "#1B5E3F" : colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => setHasConsented(!hasConsented)}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: hasConsented ? "#1B5E3F" : colors.border,
              backgroundColor: hasConsented ? "#1B5E3F" : "transparent",
              marginRight: 12,
              marginTop: 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {hasConsented && (
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>✓</Text>
            )}
          </View>
          <Text style={{ fontSize: 13, color: colors.foreground, flex: 1, lineHeight: 20 }}>
            I consent to a background check through Checkr and understand that this is required to work with Elite Bridge.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      {data.backgroundCheckStatus === "submitted" && (
        <View
          style={{
            backgroundColor: "#E8F5E9",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: "#27AE60",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#27AE60", marginBottom: 4 }}>
            ✓ Background Check Submitted
          </Text>
          <Text style={{ fontSize: 12, color: "#558B2F", lineHeight: 18 }}>
            Your background check request has been sent to Checkr. Check your email for next steps.
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={handleSubmitBackgroundCheck}
          disabled={isLoading}
          style={{
            backgroundColor: "#1B5E3F",
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
              Submit Background Check
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={prevStep}
          disabled={isLoading}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
