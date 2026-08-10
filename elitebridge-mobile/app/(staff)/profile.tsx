import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { defaultCaregiverPreferences, getCaregiverPreferences, saveCaregiverPreferences, type CaregiverPreferences } from "@/lib/caregiver-preferences";
import { clearCaregiverBackendSession, sharedApiConfigured } from "@/lib/shared-api";

type LocalSession = { email?: string; name?: string };

export default function StaffProfile() {
  const colors = useColors();
  const router = useRouter();
  const [session, setSession] = useState<LocalSession>({});
  const [preferences, setPreferences] = useState<CaregiverPreferences>(defaultCaregiverPreferences);
  const availabilityOptions = ["Mornings", "Afternoons", "Evenings", "Overnights", "Weekends"];
  const serviceOptions = ["Personal care", "Companionship", "Meal prep", "Respite", "Dementia care"];

  useEffect(() => {
    AsyncStorage.getItem("elitebridge-session").then((raw) => {
      if (!raw) return;
      try { setSession(JSON.parse(raw) as LocalSession); } catch { setSession({}); }
    });
    getCaregiverPreferences().then(setPreferences);
  }, []);

  const togglePreference = (field: "availability" | "preferredServices", value: string) => {
    setPreferences((current) => {
      const exists = current[field].includes(value);
      return { ...current, [field]: exists ? current[field].filter((item) => item !== value) : [...current[field], value] };
    });
  };

  const savePreferences = async () => {
    const distance = Number(preferences.maxDistanceMiles);
    if (!Number.isFinite(distance) || distance <= 0) {
      Alert.alert("Check travel distance", "Enter a valid maximum travel distance.");
      return;
    }
    await saveCaregiverPreferences(preferences);
    Alert.alert("Care Match saved", "Elite will use these preferences to highlight better-fit shifts in this app.");
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Sign out of Elite Bridge on this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await Promise.all([
            AsyncStorage.removeItem("elitebridge-session"),
            clearCaregiverBackendSession(),
          ]);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 18, paddingBottom: 36 }}>
      <Text style={{ color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }}>ELITE BRIDGE CAREGIVER</Text>
      <Text style={{ fontSize: 30, fontWeight: "900", color: colors.foreground, marginTop: 5 }}>Account</Text>
      <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 18 }}>Manage this caregiver session and confirm the shared-service connection.</Text>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
        <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: "#0A4A35", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Text style={{ color: "#EBCB8B", fontSize: 19, fontWeight: "900" }}>EB</Text>
        </View>
        <Text style={{ fontSize: 19, fontWeight: "900", color: colors.foreground }}>{session.name || "Caregiver account"}</Text>
        {session.email ? <Text style={{ fontSize: 13, color: colors.muted, marginTop: 5 }}>{session.email}</Text> : null}
        <View style={{ alignSelf: "flex-start", marginTop: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: sharedApiConfigured ? "#ECFDF3" : "#F2F4F7" }}>
          <Text style={{ color: sharedApiConfigured ? "#067647" : "#475467", fontSize: 11, fontWeight: "900" }}>{sharedApiConfigured ? "Secure agency sync enabled" : "Service unavailable"}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: "#EAF4EF", borderRadius: 16, padding: 15, marginBottom: 14 }}>
        <Text style={{ color: "#0A4A35", fontSize: 13, fontWeight: "900" }}>How this app works</Text>
        <Text style={{ color: "#475467", fontSize: 12, lineHeight: 19, marginTop: 6 }}>Open work, applications, approved assignments, call-outs and priority replacement offers are synchronized with Elite Bridge Employer through the shared service. Agencies keep final assignment authority.</Text>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900" }}>Care Match preferences</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Tell Elite what work fits you best. These settings are saved on this device and used to personalize the demo shift feed.</Text>

        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 8 }}>Availability</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {availabilityOptions.map((item) => {
            const active = preferences.availability.includes(item);
            return (
              <TouchableOpacity key={item} onPress={() => togglePreference("availability", item)} style={{ borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: active ? "#0A4A35" : "#F2F4F7" }}>
                <Text style={{ color: active ? "#FFFFFF" : "#475467", fontSize: 12, fontWeight: "800" }}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 8 }}>Preferred care work</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {serviceOptions.map((item) => {
            const active = preferences.preferredServices.includes(item);
            return (
              <TouchableOpacity key={item} onPress={() => togglePreference("preferredServices", item)} style={{ borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: active ? "#C58A24" : "#F2F4F7" }}>
                <Text style={{ color: active ? "#FFFFFF" : "#475467", fontSize: 12, fontWeight: "800" }}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 7 }}>Maximum travel distance</Text>
        <TextInput
          value={preferences.maxDistanceMiles}
          onChangeText={(maxDistanceMiles) => setPreferences((current) => ({ ...current, maxDistanceMiles }))}
          keyboardType="number-pad"
          placeholder="15"
          placeholderTextColor="#98A2B3"
          style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, color: colors.foreground }}
        />

        <TouchableOpacity onPress={() => setPreferences((current) => ({ ...current, instantOffers: !current.instantOffers }))} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 13 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900" }}>Instant priority offers</Text>
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>Show urgent rescue shifts when your profile is a strong match.</Text>
          </View>
          <View style={{ width: 46, height: 28, borderRadius: 999, backgroundColor: preferences.instantOffers ? "#0A4A35" : "#D0D5DD", justifyContent: "center", padding: 3, alignItems: preferences.instantOffers ? "flex-end" : "flex-start" }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={savePreferences} style={{ backgroundColor: "#0A4A35", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 14 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 14 }}>Save Care Match</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>Privacy & location</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>Elite Bridge only requests device permissions when a feature needs them. Operational data is exchanged through the authenticated shared service; database connection details are never stored in this app.</Text>
      </View>

      <TouchableOpacity onPress={handleLogout} style={{ borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", borderRadius: 12, padding: 14, alignItems: "center" }}>
        <Text style={{ color: "#B42318", fontWeight: "900", fontSize: 14 }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
