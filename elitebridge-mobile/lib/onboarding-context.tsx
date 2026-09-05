import React, { createContext, useContext, useState, useCallback } from "react";

export interface OnboardingData {
  // Step 1: Personal Information
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zip: string;

  // Step 2: Experience & Skills
  yearsOfExperience: string;
  certifications: string[];
  languages: string[];
  availabilityDays: string[];
  availabilityTimes: string[];

  // Completion
  onboardingCompleted: boolean;
  completedAt?: string;
}

interface OnboardingContextType {
  currentStep: number;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const defaultData: OnboardingData = {
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  dateOfBirth: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  yearsOfExperience: "",
  certifications: [],
  languages: [],
  availabilityDays: [],
  availabilityTimes: [],
  onboardingCompleted: false,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, 3)));
  }, []);

  const completeOnboarding = useCallback(() => {
    updateData({
      onboardingCompleted: true,
      completedAt: new Date().toISOString(),
    });
  }, [updateData]);

  const resetOnboarding = useCallback(() => {
    setCurrentStep(1);
    setData(defaultData);
  }, []);

  const value: OnboardingContextType = {
    currentStep,
    data,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    completeOnboarding,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
