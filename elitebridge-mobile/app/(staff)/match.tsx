import { useEffect, useMemo, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  defaultCaregiverPreferences,
  getCaregiverPreferences,
  saveCaregiverPreferences,
  type CaregiverPreferences,
} from "@/lib/caregiver-preferences";
import { sharedApiConfigured, syncCaregiverMatchingProfile } from "@/lib/shared-api";

const availabilityOptions = ["Mornings", "Afternoons", "Evenings", "Overnights", "Weekends"];
const serviceOptions = ["Personal care", "Companionship", "Meal prep", "Respite", "Dementia care"];

export default function StaffMatch() {
  const colors = useColors();
  const [preferences, setPreferences] = useState<CaregiverPreferences>(defaultCaregiverPreferences);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    getCaregiverPreferences().then(setPreferences).catch(() => setPreferences(defaultCaregiverPreferences));
  }, []);

  const matchScore = useMemo(() => {
    const availabilityWeight = Math.min(preferences.availability.length * 12, 36);
    const serviceWeight = Math.min(preferences.preferredServices.length * 10, 30);
    const travelMiles = Number(preferences.maxDistanceMiles);
    const travelWeight = Number.isFinite(travelMiles) && travelMiles >= 10 ? 18 : 10;
    const offerWeight = preferences.instantOffers ? 16 : 6;
    return Math.min(100, availabilityWeight + serviceWeight + travelWeight + offerWeight);
  }, [preferences]);

  const togglePreference = (field: "availability" | "preferredServices", value: string) => {
    setSavedMessage("");
    setPreferences((current) => {
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists ? current[field].filter((item) => item !== value) : [...current[field], value],
      };
    });
  };

  const savePreferences = async () => {
    const distance = Number(preferences.maxDistanceMiles);
    if (!Number.isFinite(distance) || distance <= 0 || distance > 200) {
      Alert.alert("Check travel distance", "Enter a distance from 1 to 200 miles.");
      return;
    }
    setSaving(true);
    setSavedMessage("");
    try {
      await saveCaregiverPreferences(preferences);
      if (sharedApiConfigured) await syncCaregiverMatchingProfile(preferences);
      setSavedMessage(sharedApiConfigured ? "Saved and synced with your agency" : "Saved on this device");
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Care Match not synced", error instanceof Error ? error.message : "Please try again when you are online.");
    } finally {
      setSaving(false);
    }
  };

  const selectedServices = preferences.preferredServices.length;
  const selectedHours = preferences.availability.length;
  const toggleStyle = (active: boolean) => ({
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: active ? "#0B4A36" : colors.surface,
    borderWidth: 1,
    borderColor: active ? "#0B4A36" : colors.border,
    minHeight: 42,
    justifyContent: "center" as const,
  });

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: "#B7791F", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }}>PERSONALIZED SHIFT DISCOVERY</Text>
          <Text style={{ fontSize: 27, fontWeight: "900", color: colors.foreground, marginTop: 5 }}>Find shifts that fit</Text>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 5, marginBottom: 16 }}>
            Set your schedule, care strengths, and travel range. We’ll use these preferences to surface relevant opportunities.
          </Text>

          <View style={{ backgroundColor: "#0B3D2E", borderRadius: 20, padding: 16, marginBottom: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: "#B8E0CF", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }}>MATCH PROFILE</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginTop: 4 }}>Your preferences are set</Text>
              </View>
              <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: "#EAF4EF", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#0B4A36", fontSize: 21, fontWeight: "900" }}>{matchScore}</Text>
                <Text style={{ color: "#466557", fontSize: 9, fontWeight: "900" }}>READY</Text>
              </View>
            </View>
            <View style={{ height: 6, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 14, overflow: "hidden" }}>
              <View style={{ width: `${matchScore}%`, height: 6, borderRadius: 99, backgroundColor: "#D9A441" }} />
            </View>
            <Text style={{ color: "#D7E9E1", fontSize: 11, lineHeight: 16, marginTop: 9 }}>
              {selectedHours} time preferences · {selectedServices} care skills · up to {preferences.maxDistanceMiles || "0"} miles
            </Text>
          </View>

          <View style={{ borderRadius: 18, backgroundColor: colors.surface, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900" }}>When can you work?</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 12 }}>Select every time that works for you.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {availabilityOptions.map((item) => {
                const active = preferences.availability.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => togglePreference("availability", item)}
                    style={toggleStyle(active)}
                  >
                    <Text style={{ color: active ? "#FFFFFF" : colors.foreground, fontSize: 12, fontWeight: "800" }}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ borderRadius: 18, backgroundColor: colors.surface, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900" }}>What care do you provide?</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 12 }}>Choose the services you’re comfortable supporting.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {serviceOptions.map((item) => {
                const active = preferences.preferredServices.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => togglePreference("preferredServices", item)}
                    style={toggleStyle(active)}
                  >
                    <Text style={{ color: active ? "#FFFFFF" : colors.foreground, fontSize: 12, fontWeight: "800" }}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ borderRadius: 18, backgroundColor: colors.surface, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900" }}>How far can you travel?</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }}>Set the maximum one-way distance for a shift.</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 12 }}>
              <TextInput
                accessibilityLabel="Maximum travel distance in miles"
                value={preferences.maxDistanceMiles}
                onChangeText={(maxDistanceMiles) => { setSavedMessage(""); setPreferences((current) => ({ ...current, maxDistanceMiles })); }}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                placeholder="15"
                placeholderTextColor="#98A2B3"
                style={{ flex: 1, minHeight: 48, color: colors.foreground, fontSize: 15, fontWeight: "800" }}
              />
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>miles</Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: preferences.instantOffers }}
            onPress={() => { setSavedMessage(""); setPreferences((current) => ({ ...current, instantOffers: !current.instantOffers })); }}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>Show urgent offers first</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }}>Highlight short-notice shifts when your profile fits.</Text>
            </View>
            <Switch value={preferences.instantOffers} onValueChange={(instantOffers) => { setSavedMessage(""); setPreferences((current) => ({ ...current, instantOffers })); }} trackColor={{ false: "#D0D5DD", true: "#A9D9C1" }} thumbColor={preferences.instantOffers ? "#0B4A36" : "#FFFFFF"} />
          </TouchableOpacity>
        </ScrollView>

        <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.background }}>
          {savedMessage ? <Text style={{ textAlign: "center", color: "#1B5E3F", fontSize: 11, fontWeight: "800", marginBottom: 7 }}>{savedMessage}</Text> : null}
          <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => void savePreferences()} style={{ minHeight: 50, borderRadius: 14, backgroundColor: "#0B4A36", alignItems: "center", justifyContent: "center", opacity: saving ? 0.65 : 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }}>{saving ? "Saving preferences…" : "Save preferences"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
