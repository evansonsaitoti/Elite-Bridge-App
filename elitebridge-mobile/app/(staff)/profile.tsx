import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { clearCaregiverBackendSession, sharedApiConfigured } from "@/lib/shared-api";

type LocalSession = { email?: string; name?: string };
const SUPPORT_EMAIL = "info@elitebridgestaffing.com";
const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";

export default function StaffProfile() {
  const colors = useColors();
  const router = useRouter();
  const [session, setSession] = useState<LocalSession>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("elitebridge-session").then((raw) => {
      if (!raw) return;
      try { setSession(JSON.parse(raw) as LocalSession); } catch { setSession({}); }
    });
  }, []);

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

  const requestDeletion = () => {
    const address = encodeURIComponent(SUPPORT_EMAIL);
    const subject = encodeURIComponent("Elite Bridge account deletion request");
    const body = encodeURIComponent(
      `Please delete my Elite Bridge account and associated personal data, subject to legally required record retention.\n\nAccount email: ${displayEmail || ""}\nName: ${displayName}`,
    );
    void Linking.openURL(`mailto:${address}?subject=${subject}&body=${body}`);
  };

  const openPrivacyPolicy = () => {
    void Linking.openURL(PRIVACY_URL);
  };

  const storedName = session.name?.trim();
  const storedEmail = session.email?.trim();
  const displayName = storedName && !storedName.toLowerCase().includes("demo") ? storedName : "Caregiver Review Account";
  const displayEmail = storedEmail && !storedEmail.endsWith("@elitebridge.test") ? storedEmail : "appreview-caregiver@elitebridge.test";

  return (
    <ScreenContainer>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 18, paddingBottom: 128 }}>
      <Text style={{ color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }}>ELITE BRIDGE CAREGIVER</Text>
        <Text style={{ fontSize: 30, fontWeight: "900", color: colors.foreground, marginTop: 5 }}>Profile</Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 18 }}>Manage your caregiver profile, requests, settings and agency connection.</Text>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
        <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: "#0A4A35", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Text style={{ color: "#EBCB8B", fontSize: 19, fontWeight: "900" }}>EB</Text>
        </View>
        <Text style={{ fontSize: 19, fontWeight: "900", color: colors.foreground }}>{displayName}</Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 5 }}>{displayEmail}</Text>
        <View style={{ alignSelf: "flex-start", marginTop: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: sharedApiConfigured ? "#ECFDF3" : "#F2F4F7" }}>
          <Text style={{ color: sharedApiConfigured ? "#067647" : "#475467", fontSize: 11, fontWeight: "900" }}>{sharedApiConfigured ? "Secure agency sync enabled" : "Secure device access"}</Text>
        </View>
      </View>

      <View style={{ backgroundColor: "#EAF4EF", borderRadius: 16, padding: 15, marginBottom: 14 }}>
        <Text style={{ color: "#0A4A35", fontSize: 13, fontWeight: "900" }}>How this app works</Text>
        <Text style={{ color: "#475467", fontSize: 12, lineHeight: 19, marginTop: 6 }}>Open work, applications, approved assignments, call-outs and priority replacement offers are synchronized with Elite Bridge Employer through the shared service. Agencies keep final assignment authority.</Text>
      </View>

      <View style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Time off</Text>
          <TouchableOpacity><Text style={{ color: "#0A4A35", fontSize: 13, fontWeight: "900" }}>View requests</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 9 }}>
          {[
            { label: "Time off", value: "0" },
            { label: "Sick leave", value: "0" },
            { label: "Unpaid", value: "0" },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, minHeight: 86, borderRadius: 18, backgroundColor: "#F2F4F7", padding: 12, justifyContent: "center" }}>
              <Text style={{ color: "#667085", fontSize: 11, fontWeight: "800" }}>{item.label}</Text>
              <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "900", marginTop: 8 }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 18, overflow: "hidden" }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900", padding: 15, paddingBottom: 4 }}>Form submissions</Text>
        {[
          { icon: "↺", label: "My submissions", detail: "Visit notes, clock corrections and requests" },
          { icon: "↓", label: "Shared with me", detail: "Agency documents and care instructions" },
        ].map((item, index) => (
          <TouchableOpacity key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 15, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}>
            <Text style={{ width: 28, color: index === 0 ? "#7F56D9" : "#06AED4", fontSize: 22, fontWeight: "900" }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>{item.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }}>{item.detail}</Text>
            </View>
            <Text style={{ color: "#98A2B3", fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 18, overflow: "hidden" }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900", padding: 15, paddingBottom: 4 }}>More</Text>
        {[
          { icon: "↗", label: "My activity", detail: "Applications, accepted offers and call-outs" },
          { icon: "◎", label: "Personal information", detail: displayEmail },
          { icon: "⚙", label: "Settings", detail: "Notifications, language and app preferences" },
        ].map((item, index) => (
          <TouchableOpacity key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 15, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}>
            <Text style={{ width: 28, color: "#2F9BFF", fontSize: 22, fontWeight: "900" }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>{item.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }}>{item.detail}</Text>
            </View>
            <Text style={{ color: "#98A2B3", fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>Privacy & location</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>Elite Bridge only requests device permissions when a feature needs them. Operational data is exchanged through the authenticated shared service; database connection details are never stored in this app.</Text>
        <TouchableOpacity onPress={openPrivacyPolicy} style={{ marginTop: 12, borderRadius: 12, backgroundColor: "#EAF4EF", padding: 12, alignItems: "center" }}>
          <Text style={{ color: "#0A4A35", fontWeight: "900", fontSize: 13 }}>Open privacy policy</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>Account support</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>Need help with profile access, documents, shifts, clock records or privacy questions? Contact Elite Bridge support.</Text>
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Elite Bridge caregiver support")}`)} style={{ marginTop: 12, borderRadius: 12, backgroundColor: "#EAF4EF", padding: 12, alignItems: "center" }}>
          <Text style={{ color: "#0A4A35", fontWeight: "900", fontSize: 13 }}>Contact support</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleLogout} style={{ borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", borderRadius: 12, padding: 14, alignItems: "center" }}>
        <Text style={{ color: "#B42318", fontWeight: "900", fontSize: 14 }}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 14, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
        <TouchableOpacity onPress={() => setAdvancedOpen((open) => !open)} style={{ padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900" }}>Advanced account controls</Text>
          <Text style={{ color: colors.muted, fontSize: 18, fontWeight: "900" }}>{advancedOpen ? "⌃" : "⌄"}</Text>
        </TouchableOpacity>
        {advancedOpen ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 14 }}>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>Account deletion is intentionally separated from sign out to prevent accidental requests. Elite Bridge will remove account data unless retention is legally required for staffing, payroll, safety or compliance records.</Text>
            <TouchableOpacity onPress={requestDeletion} style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", padding: 12, alignItems: "center" }}>
              <Text style={{ color: "#B42318", fontWeight: "900", fontSize: 13 }}>Request account deletion</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
