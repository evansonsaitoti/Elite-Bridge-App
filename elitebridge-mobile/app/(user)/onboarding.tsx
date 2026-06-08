import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    experience: string;
    skills: string[];
    availability: string[];
    bankAccount: string;
    backgroundCheckConsent: boolean;
  }>({
    fullName: "",
    email: "",
    phone: "",
    experience: "",
    skills: [],
    availability: [],
    bankAccount: "",
    backgroundCheckConsent: false,
  });

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleInputChange = (field: string, value: string | string[] | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleComplete = () => {
    console.log("Onboarding completed:", formData);
    // Navigate to home screen
  };

  const progressPercentage = (step / 5) * 100;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>

        <Text style={styles.stepIndicator}>Step {step} of 5</Text>

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Welcome to Elite Bridge! 👋</Text>
            <Text style={styles.subtitle}>Let's get you set up as a caregiver</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={formData.fullName}
                onChangeText={(value) => handleInputChange("fullName", value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(value) => handleInputChange("phone", value)}
              />
            </View>
          </View>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Your Experience 💼</Text>
            <Text style={styles.subtitle}>Tell us about your caregiving background</Text>

            <View style={styles.optionGroup}>
              {["0-1 years", "1-3 years", "3-5 years", "5+ years"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    formData.experience === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleInputChange("experience", option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.experience === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ Your experience helps us match you with the best shifts for your skill level.
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Your Skills 🎯</Text>
            <Text style={styles.subtitle}>Select the skills you have</Text>

            <View style={styles.skillsGrid}>
              {[
                "Medication Management",
                "Mobility Assistance",
                "Personal Care",
                "Meal Preparation",
                "Companionship",
                "Dementia Care",
              ].map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillButton,
                    formData.skills.includes(skill) && styles.skillButtonSelected,
                  ]}
                  onPress={() => {
                    const skills = formData.skills.includes(skill)
                      ? formData.skills.filter((s) => s !== skill)
                      : [...formData.skills, skill];
                    handleInputChange("skills", skills);
                  }}
                >
                  <Text
                    style={[
                      styles.skillText,
                      formData.skills.includes(skill) && styles.skillTextSelected,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Availability */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Your Availability 📅</Text>
            <Text style={styles.subtitle}>When can you work?</Text>

            <View style={styles.availabilityGrid}>
              {["6AM-2PM", "2PM-10PM", "10PM-6AM", "Flexible"].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.availabilityButton,
                    formData.availability.includes(slot) && styles.availabilityButtonSelected,
                  ]}
                  onPress={() => {
                    const availability = formData.availability.includes(slot)
                      ? formData.availability.filter((a) => a !== slot)
                      : [...formData.availability, slot];
                    handleInputChange("availability", availability);
                  }}
                >
                  <Text
                    style={[
                      styles.availabilityText,
                      formData.availability.includes(slot) && styles.availabilityTextSelected,
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ You can update your availability anytime from your profile.
              </Text>
            </View>
          </View>
        )}

        {/* Step 5: Bank Account & Background Check */}
        {step === 5 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Payment & Background Check 🔒</Text>
            <Text style={styles.subtitle}>Final setup steps</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bank Account (Last 4 digits)</Text>
              <TextInput
                style={styles.input}
                placeholder="****4242"
                keyboardType="number-pad"
                value={formData.bankAccount}
                onChangeText={(value) => handleInputChange("bankAccount", value)}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.checkboxContainer,
                formData.backgroundCheckConsent && styles.checkboxContainerChecked,
              ]}
              onPress={() =>
                handleInputChange("backgroundCheckConsent", !formData.backgroundCheckConsent as any)
              }
            >
              <View
                style={[
                  styles.checkbox,
                  formData.backgroundCheckConsent && styles.checkboxChecked,
                ]}
              >
                {formData.backgroundCheckConsent && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I consent to a background check via Checkr
              </Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ Background checks are required to work with our facilities. The process typically takes 2-3 business days.
              </Text>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, step === 1 && styles.buttonDisabled]}
            onPress={handleBack}
            disabled={step === 1}
          >
            <Text style={styles.buttonText}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={step === 5 ? handleComplete : handleNext}
          >
            <Text style={styles.buttonText}>{step === 5 ? "Complete ✓" : "Next →"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1B5E3F",
  },
  stepIndicator: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    fontWeight: "500",
  },
  stepContent: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B5E3F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  optionGroup: {
    gap: 12,
  },
  optionButton: {
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  optionButtonSelected: {
    borderColor: "#1B5E3F",
    backgroundColor: "#e8f5e9",
  },
  optionText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#1B5E3F",
    fontWeight: "600",
  },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  skillButton: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  skillButtonSelected: {
    borderColor: "#1B5E3F",
    backgroundColor: "#e8f5e9",
  },
  skillText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  skillTextSelected: {
    color: "#1B5E3F",
    fontWeight: "600",
  },
  availabilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  availabilityButton: {
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  availabilityButtonSelected: {
    borderColor: "#1B5E3F",
    backgroundColor: "#e8f5e9",
  },
  availabilityText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  availabilityTextSelected: {
    color: "#1B5E3F",
    fontWeight: "600",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  checkboxContainerChecked: {
    backgroundColor: "#e8f5e9",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "#1B5E3F",
    backgroundColor: "#1B5E3F",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  infoBox: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E3F",
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: "#1565c0",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: "#1B5E3F",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
