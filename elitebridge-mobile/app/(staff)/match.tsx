import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  defaultCaregiverPreferences,
  getCaregiverPreferences,
  saveCaregiverPreferences,
  type CaregiverPreferences,
} from "@/lib/caregiver-preferences";

const availabilityOptions = ["Mornings", "Afternoons", "Evenings", "Overnights", "Weekends"];
const serviceOptions = ["Personal care", "Companionship", "Meal prep", "Respite", "Dementia care"];

export default function StaffMatch() {
  const colors = useColors();
  const [preferences, setPreferences] = useState<CaregiverPreferences>(defaultCaregiverPreferences);

  useEffect(() => {
    getCaregiverPreferences().then(setPreferences);
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
    if (!Number.isFinite(distance) || distance <= 0) {
      Alert.alert("Check travel distance", "Enter a valid maximum travel distance.");
      return;
    }
    await saveCaregiverPreferences(preferences);
    Alert.alert("Care Match saved", "Your work feed will prioritize shifts that fit these preferences.");
  };

  const primaryServices = preferences.preferredServices.length ? preferences.preferredServices : ["Companionship", "Respite"];
  const primaryAvailability = preferences.availability.length ? preferences.availability : ["Open availability"];

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 18, paddingBottom: 128 }}
      >
        <Text style={{ color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }}>
          ELITE BRIDGE CAREGIVER
        </Text>
        <Text style={{ fontSize: 30, fontWeight: "900", color: colors.foreground, marginTop: 5 }}>Care Match</Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 18 }}>
          Control what work appears first. These settings stay on this device and help Elite rank better-fit shifts.
        </Text>

        <View style={{ backgroundColor: "#0B1220", borderRadius: 22, padding: 18, marginBottom: 14 }}>
          <Text style={{ color: "#F5D28B", fontSize: 10, fontWeight: "900", letterSpacing: 2 }}>
            MATCH READINESS
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14 }}>
            <View style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: "#EAF4EF", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#0A4A35", fontSize: 26, fontWeight: "900" }}>{matchScore}</Text>
              <Text style={{ color: "#0A4A35", fontSize: 10, fontWeight: "900" }}>Score</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "900", lineHeight: 24 }}>
                Your profile is tuned for priority offers.
              </Text>
              <Text style={{ color: "#B8C0CC", fontSize: 12, lineHeight: 18, marginTop: 5 }}>
                Best fit: {primaryServices.slice(0, 2).join(" + ")} · {primaryAvailability.slice(0, 2).join(", ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900" }}>Care Match preferences</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>
            Choose your preferred hours, care categories and travel range. Agencies still approve final assignments.
          </Text>

          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 8 }}>
            Availability
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {availabilityOptions.map((item) => {
              const active = preferences.availability.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => togglePreference("availability", item)}
                  style={{ borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: active ? "#0A4A35" : "#F2F4F7" }}
                >
                  <Text style={{ color: active ? "#FFFFFF" : "#475467", fontSize: 12, fontWeight: "800" }}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 8 }}>
            Preferred care work
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {serviceOptions.map((item) => {
              const active = preferences.preferredServices.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => togglePreference("preferredServices", item)}
                  style={{ borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: active ? "#C58A24" : "#F2F4F7" }}
                >
                  <Text style={{ color: active ? "#FFFFFF" : "#475467", fontSize: 12, fontWeight: "800" }}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 7 }}>
            Maximum travel distance
          </Text>
          <TextInput
            value={preferences.maxDistanceMiles}
            onChangeText={(maxDistanceMiles) => setPreferences((current) => ({ ...current, maxDistanceMiles }))}
            keyboardType="number-pad"
            placeholder="15"
            placeholderTextColor="#98A2B3"
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, color: colors.foreground }}
          />

          <TouchableOpacity
            onPress={() => setPreferences((current) => ({ ...current, instantOffers: !current.instantOffers }))}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 13 }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900" }}>Instant priority offers</Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                Show urgent rescue shifts when your profile is a strong match.
              </Text>
            </View>
            <View style={{ width: 46, height: 28, borderRadius: 999, backgroundColor: preferences.instantOffers ? "#0A4A35" : "#D0D5DD", justifyContent: "center", padding: 3, alignItems: preferences.instantOffers ? "flex-end" : "flex-start" }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={savePreferences} style={{ backgroundColor: "#0A4A35", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 14 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 14 }}>Save Care Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
