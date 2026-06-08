import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";

/**
 * Onboarding Step 2: Work Experience & Skills
 * Collects certifications, languages, and availability
 */
export default function OnboardingExperience() {
  const colors = useColors();
  const { data, updateData, nextStep, prevStep } = useOnboarding();

  const [yearsOfExperience, setYearsOfExperience] = useState(data.yearsOfExperience);
  const [certifications, setCertifications] = useState(data.certifications);
  const [languages, setLanguages] = useState(data.languages);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const experienceOptions = [
    "Less than 1 year",
    "1-2 years",
    "2-5 years",
    "5-10 years",
    "10+ years",
  ];

  const certificationOptions = [
    "CPR/AED",
    "First Aid",
    "Dementia Care",
    "Medication Management",
    "Mobility Assistance",
  ];

  const languageOptions = [
    "English",
    "Spanish",
    "Portuguese",
    "French",
    "Mandarin",
    "Vietnamese",
    "Other",
  ];

  const toggleCertification = (cert: string) => {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (!yearsOfExperience) newErrors.experience = "Please select your experience level";
    if (certifications.length === 0) newErrors.certifications = "Please select at least one certification";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      updateData({
        yearsOfExperience,
        certifications,
        languages,
      });
      nextStep();
    }
  };

  const renderCheckbox = (label: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: isSelected ? "rgba(27,94,63,0.1)" : colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isSelected ? "#1B5E3F" : colors.border,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: isSelected ? "#1B5E3F" : colors.border,
          backgroundColor: isSelected ? "#1B5E3F" : "transparent",
          marginRight: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isSelected && (
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>✓</Text>
        )}
      </View>
      <Text style={{ fontSize: 14, color: colors.foreground, fontWeight: "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
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
            Step 2 of 5
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>40% Complete</Text>
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
              width: "40%",
              backgroundColor: "#1B5E3F",
            }}
          />
        </View>
      </View>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 8 }}>
          Your Experience
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
          Tell us about your caregiving background and skills.
        </Text>
      </View>

      {/* Years of Experience */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Years of Experience
        </Text>
        <View style={{ gap: 8 }}>
          {experienceOptions.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setYearsOfExperience(option)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 12,
                backgroundColor: yearsOfExperience === option ? "#1B5E3F" : colors.surface,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: yearsOfExperience === option ? "#1B5E3F" : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: yearsOfExperience === option ? "#fff" : colors.foreground,
                  fontWeight: "500",
                }}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.experience && (
          <Text style={{ fontSize: 12, color: "#E74C3C", marginTop: 8 }}>
            {errors.experience}
          </Text>
        )}
      </View>

      {/* Certifications */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Certifications (Select at least one)
        </Text>
        {certificationOptions.map((cert) =>
          renderCheckbox(cert, certifications.includes(cert), () => toggleCertification(cert))
        )}
        {errors.certifications && (
          <Text style={{ fontSize: 12, color: "#E74C3C", marginTop: 8 }}>
            {errors.certifications}
          </Text>
        )}
      </View>

      {/* Languages */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Languages Spoken
        </Text>
        {languageOptions.map((lang) =>
          renderCheckbox(lang, languages.includes(lang), () => toggleLanguage(lang))
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
