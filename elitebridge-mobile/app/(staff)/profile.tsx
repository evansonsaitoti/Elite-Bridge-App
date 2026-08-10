import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { clearCaregiverBackendSession, sharedApiConfigured } from "@/lib/shared-api";

type LocalSession = { email?: string; name?: string };
const SUPPORT_EMAIL = "admin@elitebridge.com";

export default function StaffProfile() {
  const colors = useColors();
  const router = useRouter();
  const [session, setSession] = useState<LocalSession>({});

  useEffect(() => {
    AsyncStorage.getItem("elitebridge-session").then((raw) => {
      if (!raw) return;
      try { setSession(JSON.parse(raw) as LocalSession); } catch { setSession({}); }
    });
  }, []);

  const storedName = session.name?.trim();
  const storedEmail = session.email?.trim();
  const displayName = storedName && !storedName.toLowerCase().includes("demo") ? storedName : "Caregiver Review Account";
  const displayEmail = storedEmail && !storedEmail.endsWith("@elitebridge.test") ? storedEmail : "appreview-caregiver@elitebridge.test";

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
    const address = encodeURIComponent(SUPPORT_EMAIL);
    const subject = encodeURIComponent("Elite Bridge privacy policy request");
    void Linking.openURL(`mailto:${address}?subject=${subject}`);
  };

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 18, paddingBottom: 128 }}>
        <Text style={{ color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }}>ELITE BRIDGE CAREGIVER</Text>
        <Text style={{ fontSize: 30, fontWeight: "900", color: colors.foreground, marginTop: 5 }}>Account</Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 18 }}>Manage this caregiver session and confirm the shared-service connection.</Text>

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

        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>Privacy & location</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>Elite Bridge only requests device permissions when a feature needs them. Operational data is exchanged through the authenticated shared service; database connection details are never stored in this app.</Text>
          <TouchableOpacity onPress={openPrivacyPolicy} style={{ marginTop: 12, borderRadius: 12, backgroundColor: "#EAF4EF", padding: 12, alignItems: "center" }}>
            <Text style={{ color: "#0A4A35", fontWeight: "900", fontSize: 13 }}>Open privacy policy</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>Account support</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>You can request full account deletion from inside the app. Elite Bridge will remove account data unless retention is legally required for staffing, payroll, safety or compliance records.</Text>
          <TouchableOpacity onPress={requestDeletion} style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", padding: 12, alignItems: "center" }}>
            <Text style={{ color: "#B42318", fontWeight: "900", fontSize: 13 }}>Request account deletion</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogout} style={{ borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", borderRadius: 12, padding: 14, alignItems: "center" }}>
          <Text style={{ color: "#B42318", fontWeight: "900", fontSize: 14 }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
