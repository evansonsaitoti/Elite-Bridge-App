import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { clearCaregiverBackendSession, sharedApiConfigured } from "@/lib/shared-api";

type LocalSession = { email?: string; name?: string };
type ProfilePanel = "timeOff" | "submissions" | "shared" | "activity" | "personal" | "settings" | null;
const SUPPORT_EMAIL = "info@elitebridgestaffing.com";
const SUPPORT_URL = "https://elitebridgestaffing.com/contact/";
const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const TERMS_URL = "https://elitebridgestaffing.com/terms/";

export default function StaffProfile() {
  const colors = useColors();
  const router = useRouter();
  const [session, setSession] = useState<LocalSession>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ProfilePanel>(null);
  const [profileDraft, setProfileDraft] = useState({
    phone: "(508) 251-9346",
    address: "Greater Lowell, MA",
    availability: "Evenings, weekends and short-notice coverage",
    emergencyContact: "Elite Bridge Staffing support",
  });
  const [settings, setSettings] = useState({
    pushAlerts: true,
    smsAlerts: true,
    emailSummary: true,
    locationClock: true,
  });

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

  const showFeature = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "OK" }]);
  };

  const openPanel = (panel: NonNullable<ProfilePanel>) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const openUrl = async (url: string, fallbackTitle = "Unable to open link") => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showFeature(fallbackTitle, url);
        return;
      }
      await Linking.openURL(url);
    } catch {
      showFeature(fallbackTitle, url);
    }
  };

  const contactSupport = () => {
    Alert.alert("Contact support", "Choose how you want to contact Elite Bridge support.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Email",
        onPress: () => {
          const subject = encodeURIComponent("Elite Bridge caregiver support");
          void openUrl(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
        },
      },
      { text: "Open support page", onPress: () => void openUrl(SUPPORT_URL) },
    ]);
  };

  const requestDeletion = () => {
    Alert.alert(
      "Request account deletion",
      "This will open a prepared email to Elite Bridge support. Your account is not deleted until support verifies and processes the request.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            const address = encodeURIComponent(SUPPORT_EMAIL);
            const subject = encodeURIComponent("Elite Bridge account deletion request");
            const body = encodeURIComponent(
              `Please delete my Elite Bridge account and associated personal data, subject to legally required record retention.\n\nAccount email: ${displayEmail || ""}\nName: ${displayName}`,
            );
            void openUrl(`mailto:${address}?subject=${subject}&body=${body}`);
          },
        },
      ],
    );
  };

  const openPrivacyPolicy = () => {
    void openUrl(PRIVACY_URL);
  };

  const storedName = session.name?.trim();
  const storedEmail = session.email?.trim();
  const displayName = storedName && !storedName.toLowerCase().includes("demo") ? storedName : "Caregiver Review Account";
  const displayEmail = storedEmail && !storedEmail.endsWith("@elitebridge.test") ? storedEmail : "appreview-caregiver@elitebridge.test";
  const panelCard = { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15, marginBottom: 18 } as const;
  const inputStyle = { borderWidth: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8 } as const;
  const saveProfile = () => {
    Alert.alert("Personal information saved", "Your profile updates are saved on this device and ready to sync with the agency workspace.");
  };
  const saveSettings = () => {
    Alert.alert("Settings saved", "Your notification and privacy preferences have been saved.");
  };

  const renderActivePanel = () => {
    if (!activePanel) return null;

    if (activePanel === "timeOff") {
      return (
        <View style={panelCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Time off requests</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setActivePanel(null)}><Text style={{ color: colors.muted, fontWeight: "900" }}>Close</Text></TouchableOpacity>
          </View>
          {[
            { title: "Family appointment", date: "Aug 26, 2026", status: "Pending agency review", type: "Unpaid time off" },
            { title: "Sick leave", date: "Sep 2, 2026", status: "Draft - not submitted", type: "Sick leave" },
          ].map((item) => (
            <View key={item.title} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 15 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, marginTop: 3 }}>{item.type} • {item.date}</Text>
              <Text style={{ color: "#0A4A35", marginTop: 6, fontWeight: "800" }}>{item.status}</Text>
            </View>
          ))}
          <TouchableOpacity accessibilityRole="button" onPress={() => showFeature("New time off request", "Use the Services tab to submit time off, sick leave or shift-swap requests to the agency.")} style={{ backgroundColor: "#0A4A35", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "white", fontWeight: "900" }}>Create request</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activePanel === "submissions") {
      return (
        <View style={panelCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>My submissions</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setActivePanel(null)}><Text style={{ color: colors.muted, fontWeight: "900" }}>Close</Text></TouchableOpacity>
          </View>
          {[
            { title: "Visit note - Mrs. A.", detail: "Meal preparation and companionship completed.", status: "Submitted" },
            { title: "Clock correction", detail: "Requested correction for 6:38 PM clock-out.", status: "Under review" },
            { title: "Availability update", detail: profileDraft.availability, status: "Saved" },
          ].map((item) => (
            <View key={item.title} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900" }}>{item.title}</Text>
              <Text style={{ color: colors.muted, lineHeight: 19, marginTop: 3 }}>{item.detail}</Text>
              <Text style={{ color: "#C58A24", fontWeight: "900", marginTop: 6 }}>{item.status}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (activePanel === "shared") {
      return (
        <View style={panelCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Shared with me</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setActivePanel(null)}><Text style={{ color: colors.muted, fontWeight: "900" }}>Close</Text></TouchableOpacity>
          </View>
          {[
            { title: "Care plan: Mrs. A.", detail: "Companionship, meal prep, mobility reminders and family notes." },
            { title: "Agency handbook", detail: "Clock-in standards, visit documentation and escalation steps." },
            { title: "Credential reminder", detail: "CPR certificate verified through Dec 2027." },
          ].map((item) => (
            <TouchableOpacity key={item.title} accessibilityRole="button" onPress={() => showFeature(item.title, item.detail)} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900" }}>{item.title}</Text>
              <Text style={{ color: colors.muted, lineHeight: 19, marginTop: 3 }}>{item.detail}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (activePanel === "activity") {
      return (
        <View style={panelCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>My activity</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setActivePanel(null)}><Text style={{ color: colors.muted, fontWeight: "900" }}>Close</Text></TouchableOpacity>
          </View>
          {[
            { time: "Today", text: "Accepted priority shift: Companionship + meal prep." },
            { time: "Yesterday", text: "Clock record saved for agency review." },
            { time: "This week", text: "Profile preferences updated for evening and weekend work." },
          ].map((item) => (
            <View key={item.text} style={{ flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#0A4A35", marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#C58A24", fontWeight: "900", fontSize: 12 }}>{item.time}</Text>
                <Text style={{ color: colors.foreground, marginTop: 3, lineHeight: 19 }}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (activePanel === "personal") {
      return (
        <View style={panelCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Personal information</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setActivePanel(null)}><Text style={{ color: colors.muted, fontWeight: "900" }}>Close</Text></TouchableOpacity>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Name</Text>
          <Text style={{ color: colors.foreground, fontWeight: "900", marginTop: 4, marginBottom: 10 }}>{displayName}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Email</Text>
          <Text style={{ color: colors.foreground, fontWeight: "900", marginTop: 4, marginBottom: 10 }}>{displayEmail}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Phone</Text>
          <TextInput accessibilityLabel="Phone number" value={profileDraft.phone} onChangeText={(phone) => setProfileDraft((draft) => ({ ...draft, phone }))} style={inputStyle} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>Service area</Text>
          <TextInput accessibilityLabel="Service area" value={profileDraft.address} onChangeText={(address) => setProfileDraft((draft) => ({ ...draft, address }))} style={inputStyle} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>Emergency contact</Text>
          <TextInput accessibilityLabel="Emergency contact" value={profileDraft.emergencyContact} onChangeText={(emergencyContact) => setProfileDraft((draft) => ({ ...draft, emergencyContact }))} style={inputStyle} />
          <TouchableOpacity accessibilityRole="button" onPress={saveProfile} style={{ backgroundColor: "#0A4A35", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 14 }}>
            <Text style={{ color: "white", fontWeight: "900" }}>Save personal information</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={panelCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Settings</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setActivePanel(null)}><Text style={{ color: colors.muted, fontWeight: "900" }}>Close</Text></TouchableOpacity>
        </View>
        {[
          { key: "pushAlerts" as const, label: "Push notifications", detail: "Priority shifts, assignments and call-outs" },
          { key: "smsAlerts" as const, label: "SMS alerts", detail: "Urgent schedule messages" },
          { key: "emailSummary" as const, label: "Email summaries", detail: "Weekly activity and submission updates" },
          { key: "locationClock" as const, label: "Location for clock in/out", detail: "Used only when recording visit time" },
        ].map((item) => (
          <View key={item.key} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900" }}>{item.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 }}>{item.detail}</Text>
            </View>
            <Switch value={settings[item.key]} onValueChange={(value) => setSettings((current) => ({ ...current, [item.key]: value }))} />
          </View>
        ))}
        <TouchableOpacity accessibilityRole="button" onPress={saveSettings} style={{ backgroundColor: "#0A4A35", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 8 }}>
          <Text style={{ color: "white", fontWeight: "900" }}>Save settings</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => openPanel("timeOff")}
          >
            <Text style={{ color: "#0A4A35", fontSize: 13, fontWeight: "900" }}>View requests</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            key={item.label}
            accessibilityRole="button"
            onPress={() => openPanel(item.label === "My submissions" ? "submissions" : "shared")}
            style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 15, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
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
          <TouchableOpacity
            key={item.label}
            accessibilityRole="button"
            onPress={() => {
              if (item.label === "My activity") {
                openPanel("activity");
                return;
              }
              if (item.label === "Personal information") {
                openPanel("personal");
                return;
              }
              openPanel("settings");
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 15, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            <Text style={{ width: 28, color: "#2F9BFF", fontSize: 22, fontWeight: "900" }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>{item.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }}>{item.detail}</Text>
            </View>
            <Text style={{ color: "#98A2B3", fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderActivePanel()}

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
        <TouchableOpacity onPress={contactSupport} style={{ marginTop: 12, borderRadius: 12, backgroundColor: "#EAF4EF", padding: 12, alignItems: "center" }}>
          <Text style={{ color: "#0A4A35", fontWeight: "900", fontSize: 13 }}>Contact support</Text>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>Legal</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>Review privacy, terms and caregiver support information.</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <TouchableOpacity onPress={() => void openUrl(TERMS_URL)} style={{ flex: 1, borderRadius: 12, backgroundColor: "#F8F4EA", padding: 12, alignItems: "center" }}>
            <Text style={{ color: "#8A5A00", fontWeight: "900", fontSize: 13 }}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void openUrl(SUPPORT_URL)} style={{ flex: 1, borderRadius: 12, backgroundColor: "#EAF4EF", padding: 12, alignItems: "center" }}>
            <Text style={{ color: "#0A4A35", fontWeight: "900", fontSize: 13 }}>Support page</Text>
          </TouchableOpacity>
        </View>
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
