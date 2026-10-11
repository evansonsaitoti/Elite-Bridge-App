import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { enableCaregiverPushNotifications } from "@/lib/push-notifications";
import { registerCaregiverAccount, sharedApiConfigured } from "@/lib/shared-api";

/**
 * Onboarding Step 1: Welcome & Personal Information
 * Collects basic personal details
 */
export default function OnboardingWelcome() {
  const colors = useColors();
  const { data, updateData, nextStep } = useOnboarding();
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string }>();
  const inviteToken = Array.isArray(params.invite) ? params.invite[0] : params.invite || data.inviteToken;
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasStaffSession, setHasStaffSession] = useState(data.accountCreated);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("elitebridge-session")
      .then((stored) => {
        if (!active) return;
        try {
          const session = stored ? JSON.parse(stored) as { role?: string; email?: string; name?: string } : null;
          if (session?.role === "staff") {
            setHasStaffSession(true);
            updateData({
              accountCreated: true,
              email: data.email || session.email || "",
              fullName: data.fullName || session.name || "",
            });
            if (!email && session.email) setEmail(session.email);
            if (!fullName && session.name) setFullName(session.name);
          }
        } catch {
          setHasStaffSession(false);
        } finally {
          setCheckingSession(false);
        }
      })
      .catch(() => active && setCheckingSession(false));
    return () => { active = false; };
  }, [data.email, data.fullName, email, fullName, updateData]);

  useEffect(() => {
    const inviteToken = Array.isArray(params.invite) ? params.invite[0] : params.invite;
    if (inviteToken && inviteToken !== data.inviteToken) updateData({ inviteToken });
  }, [data.inviteToken, params.invite, updateData]);

  if (checkingSession) return null;
  if (!inviteToken && !hasStaffSession) return <Redirect href="/(root)" />;
  const accountAlreadyCreated = data.accountCreated || hasStaffSession;

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) newErrors.email = "Enter a valid email address";
    if (!accountAlreadyCreated && password.length < 8) newErrors.password = "Use at least 8 characters";
    if (!accountAlreadyCreated && !phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Alert.alert(
        "Complete required fields",
        accountAlreadyCreated
          ? "Confirm your name and email to continue your profile."
          : "Enter your name, email, phone number and password to create caregiver access.",
      );
    }
    return Object.keys(newErrors).length === 0;
  };

  const persistBasicAccount = async () => {
    if (!validateStep()) return false;
    const nextData = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phoneNumber: phoneNumber.trim(),
      dateOfBirth: dateOfBirth.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
      inviteToken: inviteToken || data.inviteToken,
    };
    updateData(nextData);
    if (accountAlreadyCreated) return true;
    if (!sharedApiConfigured) {
      Alert.alert("Service unavailable", "Elite Bridge cannot reach the secure agency service in this build.");
      return false;
    }
    try {
      setSubmitting(true);
      const names = nextData.fullName.split(/\s+/);
      const firstName = names.shift() || "Caregiver";
      const lastName = names.join(" ") || "Applicant";
      const user = await registerCaregiverAccount({
        firstName,
        lastName,
        phone: nextData.phoneNumber,
        email: nextData.email,
        password: nextData.password,
        inviteToken: nextData.inviteToken,
      });
      await AsyncStorage.setItem("elitebridge-session", JSON.stringify({
        role: "staff",
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        profileStatus: "incomplete",
        signedInAt: new Date().toISOString(),
      }));
      updateData({ accountCreated: true });
      setHasStaffSession(true);
      void enableCaregiverPushNotifications().catch(() => false);
      return true;
    } catch (error) {
      Alert.alert("Could not create caregiver access", error instanceof Error ? error.message : "Please check the invitation and try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (await persistBasicAccount()) {
      nextStep();
      router.push("/(onboarding)/experience");
    }
  };

  const handleSkip = async () => {
    if (!await persistBasicAccount()) return;
    Alert.alert(
      "Open caregiver app?",
      "Your account is created. You can use the app now and finish experience, background check and payment details later.",
      [
        { text: "Keep editing", onPress: () => {} },
        {
          text: "Open app",
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
          Create caregiver access.
        </Text>
        <Text style={{ color: "#D9E9E2", fontSize: 14, lineHeight: 21, marginTop: 8 }}>
          Start with your invited account. You can finish profile details, availability, background check and payment setup later.
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
            Step 1 of 5 · Account access
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
          Use your name, email, phone number and password to unlock the caregiver app. The remaining details can be completed later.
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
        {accountAlreadyCreated ? (
          <View style={{ backgroundColor: "#F0F7F3", borderColor: "#C9DFD3", borderRadius: 14, borderWidth: 1, marginBottom: 15, padding: 14 }}>
            <Text style={{ color: "#1B5E3F", fontSize: 13, fontWeight: "900", marginBottom: 4 }}>Account access is active</Text>
            <Text style={{ color: "#475467", fontSize: 13, lineHeight: 19 }}>You can use Elite Care now. Continue only when you want to finish profile details.</Text>
          </View>
        ) : renderInput(
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
          "Street Address (Optional)",
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
          disabled={submitting}
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
            {submitting ? "Creating account..." : accountAlreadyCreated ? "Continue profile setup" : "Create account & continue setup"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          disabled={submitting}
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
            {submitting ? "Creating account..." : accountAlreadyCreated ? "Open app now" : "Create account & finish later"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
