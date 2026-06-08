import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";

/**
 * Onboarding Step 4: Bank Account Setup
 * Collects and validates bank account information via Stripe
 */
export default function OnboardingBankAccount() {
  const colors = useColors();
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);

  const [bankName, setBankName] = useState(data.bankName);
  const [accountHolderName, setAccountHolderName] = useState(data.accountHolderName);
  const [accountType, setAccountType] = useState(data.accountType);
  const [routingNumber, setRoutingNumber] = useState(data.routingNumber);
  const [accountNumber, setAccountNumber] = useState(data.accountNumber);
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (!bankName.trim()) newErrors.bankName = "Bank name is required";
    if (!accountHolderName.trim()) newErrors.accountHolderName = "Account holder name is required";
    if (!routingNumber.trim()) newErrors.routingNumber = "Routing number is required";
    if (routingNumber.length !== 9) newErrors.routingNumber = "Routing number must be 9 digits";
    if (!accountNumber.trim()) newErrors.accountNumber = "Account number is required";
    if (accountNumber !== confirmAccountNumber) newErrors.confirmAccountNumber = "Account numbers do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyAccount = async () => {
    if (!validateStep()) return;

    setIsLoading(true);
    try {
      // Simulate Stripe API call for bank account verification
      // In production, this would call the backend which integrates with Stripe
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock successful verification
      const stripeTokenId = `ba_${Date.now()}`;

      updateData({
        bankName,
        accountHolderName,
        accountType,
        routingNumber,
        accountNumber,
        bankAccountVerified: true,
        stripeTokenId,
      });

      Alert.alert(
        "Account Verified",
        "Your bank account has been verified successfully. You're almost done!",
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
      Alert.alert("Verification Failed", "Could not verify your bank account. Please check your information and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    error?: string,
    keyboardType: "default" | "number-pad" = "default"
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.surface,
          borderRadius: 8,
          padding: 12,
          fontSize: 14,
          color: colors.foreground,
          borderWidth: 1,
          borderColor: error ? "#E74C3C" : colors.border,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
      {error && (
        <Text style={{ fontSize: 12, color: "#E74C3C", marginTop: 4 }}>
          {error}
        </Text>
      )}
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
            Step 4 of 5
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>80% Complete</Text>
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
              width: "80%",
              backgroundColor: "#1B5E3F",
            }}
          />
        </View>
      </View>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
          Bank Account Setup
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
          We'll deposit your earnings directly to this account. Your information is securely encrypted.
        </Text>
      </View>

      {/* Security Info */}
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
          🔒 Your Information is Safe
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>
          We use Stripe for secure payment processing. Your bank details are encrypted and never stored on our servers.
        </Text>
      </View>

      {/* Form */}
      <View style={{ marginBottom: 24 }}>
        {renderInput(
          "Bank Name",
          bankName,
          setBankName,
          "e.g., Chase Bank",
          errors.bankName
        )}

        {renderInput(
          "Account Holder Name",
          accountHolderName,
          setAccountHolderName,
          "Name on your bank account",
          errors.accountHolderName
        )}

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
            Account Type
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {["checking", "savings"].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setAccountType(type as "checking" | "savings")}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  backgroundColor: accountType === type ? "#1B5E3F" : colors.surface,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: accountType === type ? "#1B5E3F" : colors.border,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: accountType === type ? "#fff" : colors.foreground,
                    textTransform: "capitalize",
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {renderInput(
          "Routing Number",
          routingNumber,
          setRoutingNumber,
          "9-digit routing number",
          errors.routingNumber,
          "number-pad"
        )}

        {renderInput(
          "Account Number",
          accountNumber,
          setAccountNumber,
          "Your account number",
          errors.accountNumber,
          "number-pad"
        )}

        {renderInput(
          "Confirm Account Number",
          confirmAccountNumber,
          setConfirmAccountNumber,
          "Re-enter your account number",
          errors.confirmAccountNumber,
          "number-pad"
        )}
      </View>

      {/* Verification Status */}
      {data.bankAccountVerified && (
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
            ✓ Bank Account Verified
          </Text>
          <Text style={{ fontSize: 12, color: "#558B2F", lineHeight: 18 }}>
            Your bank account has been verified and is ready to receive payments.
          </Text>
        </View>
      )}

      {/* Buttons */}
      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={handleVerifyAccount}
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
              Verify Account
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
