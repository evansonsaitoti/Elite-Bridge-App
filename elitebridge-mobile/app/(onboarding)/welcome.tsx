import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
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
  const [email, setEmail] = useState(data.email);
  const [password, setPassword] = useState(data.password);
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
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) newErrors.email = "Enter a valid email address";
    if (password.length < 8) newErrors.password = "Use at least 8 characters";
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    if (!address.trim()) newErrors.address = "Address is required";
    if (!city.trim()) newErrors.city = "City is required";
    if (!state.trim()) newErrors.state = "State is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Alert.alert(
        "Complete required fields",
        "Enter valid account, contact and address information to continue.",
      );
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      updateData({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: dateOfBirth.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zip: zip.trim(),
      });
      nextStep();
      router.push("/(onboarding)/experience");
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
    keyboardType: "default" | "phone-pad" | "email-address" = "default",
    secureTextEntry = false,
  ) => (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 13, fontWeight: "800", color: "#344054", marginBottom: 7 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: "#F9FAFB",
          borderRadius: 14,
          minHeight: 50,
          paddingHorizontal: 14,
          fontSize: 15,
          color: "#101828",
          borderWidth: 1,
          borderColor: error ? "#D92D20" : "#D0D5DD",
        }}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        autoCorrect={false}
      />
      {error && (
        <Text style={{ fontSize: 12, color: "#D92D20", marginTop: 5 }}>
          {error}
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#F7FAF8" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: "#0A4A35", borderRadius: 24, padding: 20, marginBottom: 18 }}>
        <Text style={{ color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>CAREGIVER APPLICATION</Text>
        <Text style={{ color: "#FFFFFF", fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 8 }}>
          Create your caregiver profile.
        </Text>
        <Text style={{ color: "#D9E9E2", fontSize: 14, lineHeight: 21, marginTop: 8 }}>
          Tell us who you are so Elite Bridge can match you with the right care assignments.
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={{ marginBottom: 18, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#EAECF0" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
            Step 1 of 5 · Personal details
          </Text>
          <Text style={{ fontSize: 13, color: "#667085", fontWeight: "700" }}>20% Complete</Text>
        </View>
        <View
          style={{
            height: 6,
            backgroundColor: "#EAECF0",
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
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#101828", marginBottom: 7 }}>
          Basic information
        </Text>
        <Text style={{ fontSize: 14, color: "#667085", lineHeight: 21 }}>
          Use your legal name and current contact information. You can review everything before submitting.
        </Text>
      </View>

      {/* Form */}
      <View style={{ marginBottom: 20, backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "#EAECF0" }}>
        {renderInput(
          "Full Name",
          fullName,
          setFullName,
          "Enter your full name",
          errors.fullName
        )}
        {renderInput(
          "Email Address",
          email,
          setEmail,
          "you@example.com",
          errors.email,
          "email-address"
        )}
        {renderInput(
          "Create Password",
          password,
          setPassword,
          "At least 8 characters",
          errors.password,
          "default",
          true
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
          "Date of Birth (Optional)",
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
          "ZIP Code (Optional)",
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
          testID="caregiver-profile-continue"
          accessibilityRole="button"
          accessibilityLabel="Continue to caregiver experience"
          style={{
            backgroundColor: "#1B5E3F",
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#fff" }}>
            Continue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#D0D5DD",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#344054" }}>
            Skip for Now
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
