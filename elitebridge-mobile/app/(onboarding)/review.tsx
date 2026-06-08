import React from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";
import { useRouter } from "expo-router";

/**
 * Onboarding Step 5: Review & Complete
 * Summary of all information and completion confirmation
 */
export default function OnboardingReview() {
  const colors = useColors();
  const { data, completeOnboarding, prevStep } = useOnboarding();
  const router = useRouter();

  const handleCompleteOnboarding = () => {
    completeOnboarding();
    Alert.alert(
      "Welcome to Elite Bridge! 🎉",
      "Your onboarding is complete. You're ready to start working!",
      [
        {
          text: "Go to Home",
          onPress: () => {
            router.replace("/(staff)/home");
          },
        },
      ]
    );
  };

  const renderInfoSection = (title: string, items: { label: string; value: string }[]) => (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#1B5E3F",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
        {title}
      </Text>
      {items.map((item, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: index < items.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {item.label}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );

  const getBackgroundCheckStatusLabel = () => {
    switch (data.backgroundCheckStatus) {
      case "submitted":
        return "Submitted (Pending)";
      case "clear":
        return "Clear";
      case "consider":
        return "Under Review";
      default:
        return "Not Started";
    }
  };

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
            Step 5 of 5
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>100% Complete</Text>
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
              width: "100%",
              backgroundColor: "#1B5E3F",
            }}
          />
        </View>
      </View>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
          Review Your Information
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
          Please review your information before completing onboarding. You can edit any section by going back.
        </Text>
      </View>

      {/* Personal Information */}
      {renderInfoSection("👤 Personal Information", [
        { label: "Full Name", value: data.fullName },
        { label: "Phone", value: data.phoneNumber },
        { label: "Date of Birth", value: data.dateOfBirth },
        { label: "Address", value: `${data.address}, ${data.city}, ${data.state} ${data.zip}` },
      ])}

      {/* Experience & Skills */}
      {renderInfoSection("💼 Experience & Skills", [
        { label: "Experience", value: data.yearsOfExperience },
        { label: "Certifications", value: data.certifications.join(", ") || "None" },
        { label: "Languages", value: data.languages.join(", ") || "English" },
      ])}

      {/* Background Check Status */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: data.backgroundCheckStatus === "submitted" ? "#F7DC6F" : "#1B5E3F",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          🔒 Background Check
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Status
          </Text>
          <View
            style={{
              backgroundColor: data.backgroundCheckStatus === "submitted" ? "#F7DC6F" : "#E8F5E9",
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: data.backgroundCheckStatus === "submitted" ? "#000" : "#27AE60",
              }}
            >
              {getBackgroundCheckStatusLabel()}
            </Text>
          </View>
        </View>
      </View>

      {/* Bank Account Status */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderLeftWidth: 4,
          borderLeftColor: data.bankAccountVerified ? "#27AE60" : "#1B5E3F",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          💳 Bank Account
        </Text>
        {data.bankAccountVerified ? (
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.muted }}>
                Bank
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                {data.bankName}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.muted }}>
                Account Type
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, textTransform: "capitalize" }}>
                {data.accountType}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.muted }}>
                Status
              </Text>
              <View
                style={{
                  backgroundColor: "#E8F5E9",
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#27AE60" }}>
                  ✓ Verified
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Not yet configured
          </Text>
        )}
      </View>

      {/* Completion Message */}
      {data.backgroundCheckStatus === "submitted" && data.bankAccountVerified && (
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
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#27AE60", marginBottom: 8 }}>
            ✓ You're All Set!
          </Text>
          <Text style={{ fontSize: 13, color: "#558B2F", lineHeight: 20 }}>
            Your background check is being processed and your bank account is verified. You can start browsing and applying for shifts right away!
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={handleCompleteOnboarding}
          style={{
            backgroundColor: "#1B5E3F",
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
            🎉 Start Working
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={prevStep}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
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
