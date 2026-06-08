import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";
import { useRouter } from "expo-router";

/**
 * Onboarding Step 1: Welcome & Personal Information
 * Collects basic personal details
 */
export default function OnboardingWelcome() {
  const colors = useColors();
  const { data, updateData, nextStep } = useOnboarding();
  const router = useRouter();

  const [fullName, setFullName] = useState(data.fullName);
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber);
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth);
  const [address, setAddress] = useState(data.address);
  const [city, setCity] = useState(data.city);
  const [state, setState] = useState(data.state);
  const [zip, setZip] = useState(data.zip);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    if (!dateOfBirth.trim()) newErrors.dateOfBirth = "Date of birth is required";
    if (!address.trim()) newErrors.address = "Address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";
    if (!zip.trim()) newErrors.zip = "ZIP code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      updateData({
        fullName,
        phoneNumber,
        dateOfBirth,
        address,
        city,
        state,
        zip,
      });
      nextStep();
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Onboarding?",
      "You need to complete onboarding to start working. Are you sure?",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Go Back",
          onPress: () => router.replace("/(staff)/home"),
        },
      ]
    );
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    error?: string,
    keyboardType: "default" | "phone-pad" | "email-address" = "default"
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
            Step 1 of 5
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>20% Complete</Text>
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
              width: "20%",
              backgroundColor: "#1B5E3F",
            }}
          />
        </View>
      </View>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
          Welcome to Elite Bridge
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
          Let's get you set up to start working. We'll collect some basic information to complete your profile.
        </Text>
      </View>

      {/* Form */}
      <View style={{ marginBottom: 24 }}>
        {renderInput(
          "Full Name",
          fullName,
          setFullName,
          "Enter your full name",
          errors.fullName
        )}
        {renderInput(
          "Phone Number",
          phoneNumber,
          setPhoneNumber,
          "Enter your phone number",
          errors.phoneNumber,
          "phone-pad"
        )}
        {renderInput(
          "Date of Birth",
          dateOfBirth,
          setDateOfBirth,
          "MM/DD/YYYY",
          errors.dateOfBirth
        )}
        {renderInput(
          "Street Address",
          address,
          setAddress,
          "Enter your street address",
          errors.address
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            {renderInput(
              "City",
              city,
              setCity,
              "City",
              errors.city
            )}
          </View>
          <View style={{ flex: 0.5 }}>
            {renderInput(
              "State",
              state,
              setState,
              "MA",
              errors.state
            )}
          </View>
        </View>

        {renderInput(
          "ZIP Code",
          zip,
          setZip,
          "12345",
          errors.zip
        )}
      </View>

      {/* Buttons */}
      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={handleNext}
          style={{
            backgroundColor: "#1B5E3F",
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
            Next
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
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
            Skip for Now
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
