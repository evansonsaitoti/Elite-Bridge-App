import AsyncStorage from "@react-native-async-storage/async-storage";

const CAREGIVER_PREFERENCES_KEY = "elitebridge-caregiver-preferences-v1";

export type CaregiverPreferences = {
  availability: string[];
  preferredServices: string[];
  maxDistanceMiles: string;
  instantOffers: boolean;
};

export const defaultCaregiverPreferences: CaregiverPreferences = {
  availability: ["Evenings", "Weekends"],
  preferredServices: ["Companionship", "Respite"],
  maxDistanceMiles: "15",
  instantOffers: true,
};

export async function getCaregiverPreferences(): Promise<CaregiverPreferences> {
  const raw = await AsyncStorage.getItem(CAREGIVER_PREFERENCES_KEY);
  if (!raw) return defaultCaregiverPreferences;
  try {
    return { ...defaultCaregiverPreferences, ...(JSON.parse(raw) as Partial<CaregiverPreferences>) };
  } catch {
    return defaultCaregiverPreferences;
  }
}

export async function saveCaregiverPreferences(preferences: CaregiverPreferences): Promise<void> {
  await AsyncStorage.setItem(CAREGIVER_PREFERENCES_KEY, JSON.stringify(preferences));
}
