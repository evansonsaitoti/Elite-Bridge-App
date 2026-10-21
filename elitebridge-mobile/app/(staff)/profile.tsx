import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Linking, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { clearCaregiverBackendSession, deleteCaregiverBackendAccount, fetchCaregiverPersonalDetails, saveCaregiverPersonalDetails, fetchCaregiverProfilePhoto, uploadCaregiverProfilePhoto, sharedApiConfigured } from "@/lib/shared-api";
import { disableCaregiverPushNotifications, enableCaregiverPushNotifications } from "@/lib/push-notifications";

type LocalSession = { email?: string; name?: string };
type ProfilePanel = "timeOff" | "submissions" | "shared" | "activity" | "personal" | "settings" | null;
const SUPPORT_EMAIL = "info@elitebridgestaffing.com";
const SUPPORT_URL = "https://elitebridgestaffing.com/contact/";
const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const TERMS_URL = "https://elitebridgestaffing.com/terms/";
const PROFILE_DRAFT_KEY = "elitebridge-caregiver-profile-draft-v1"; // Old device-only values are not silently reused as agency records.
const SETTINGS_KEY = "elitebridge-caregiver-settings-v1";

export default function StaffProfile() {
  const colors = useColors();
  const router = useRouter();
  const [session, setSession] = useState<LocalSession>({});
  const [deleting, setDeleting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAdvancedAccount, setShowAdvancedAccount] = useState(false);
  const [activePanel, setActivePanel] = useState<ProfilePanel>(null);
  const [profileDraft, setProfileDraft] = useState({
    phone: "",
    address: "",
    emergencyContact: "",
  });
  const [settings, setSettings] = useState({ pushAlerts: true });

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("elitebridge-session"),
      AsyncStorage.getItem(SETTINGS_KEY),
      fetchCaregiverPersonalDetails(),
    ]).then(([rawSession, rawSettings, details]) => {
      if (rawSession) {
        try { setSession(JSON.parse(rawSession) as LocalSession); } catch { setSession({}); }
      }
      if (rawSettings) {
        try { setSettings((current) => ({ ...current, ...JSON.parse(rawSettings) })); } catch { /* Keep safe defaults. */ }
      }
      setProfileDraft(details);
      setProfileSyncError("");
    }).catch(() => {
      setProfileSyncError("Could not load saved personal details from the agency. Check your connection and reopen this screen.");
      void AsyncStorage.getItem("elitebridge-session").then((raw) => {
        if (!raw) return;
        try { setSession(JSON.parse(raw) as LocalSession); } catch { /* Keep safe defaults */ }
      });
    });
  }, []);

  useEffect(() => {
    if (!sharedApiConfigured) return;
    fetchCaregiverProfilePhoto().then(setPhoto).catch(() => {});
  }, []);

  const chooseProfilePhoto = async () => {
    if (uploadingPhoto) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo permission needed", "Allow photo access to select your profile picture.");
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.25, base64: true,
      });
      if (picked.canceled || !picked.assets[0]?.base64) return;
      const asset = picked.assets[0];
      const mime = asset.mimeType === "image/png" ? "image/png" : "image/jpeg";
      const value = "data:" + mime + ";base64," + asset.base64;
      if (value.length > 600000) {
        Alert.alert("Photo too large", "Please choose a smaller photo.");
        return;
      }
      setUploadingPhoto(true);
      await uploadCaregiverProfilePhoto(value);
      setPhoto(value);
      Alert.alert("Photo uploaded", "Your picture is saved in the shared Elite Bridge caregiver profile.");
    } catch (error) {
      Alert.alert("Photo could not be uploaded", error instanceof Error ? error.message : "Please try again.");
    } finally { setUploadingPhoto(false); }
  };

  const handleLogout = () => {
    Alert.alert("Sign out", "Sign out of Elite Bridge on this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await disableCaregiverPushNotifications().catch(() => undefined);
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

  const deleteAccount = () => {
    Alert.alert(
      "Permanently delete account?",
      "This permanently deletes your Elite Bridge login and caregiver profile. This cannot be undone. Records that must be retained for legal, payroll, safety or compliance obligations may be preserved as required by law.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteCaregiverBackendAccount();
              await AsyncStorage.multiRemove([
                "elitebridge-session",
                PROFILE_DRAFT_KEY,
                SETTINGS_KEY,
                "elitebridge-caregiver-preferences-v1",
                "elitebridge-staff-services-v1",
              ]);
              Alert.alert("Account deleted", "Your Elite Bridge account and local caregiver data have been deleted.", [
                { text: "Done", onPress: () => router.replace("/(auth)/login") },
              ]);
            } catch (error) {
              Alert.alert("Unable to delete account", error instanceof Error ? error.message : "Please try again.");
            } finally {
              setDeleting(false);
            }
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
  const displayName = storedName || "Caregiver";
  const displayEmail = storedEmail || "No email saved";
  const panelCard = { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15, marginBottom: 18 } as const;
  const inputStyle = { borderWidth: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8 } as const;
  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const saved = await saveCaregiverPersonalDetails(profileDraft);
      setProfileDraft(saved);
      setProfileSyncError("");
      Alert.alert("Profile updated", "Your details were saved to your secure caregiver account.");
    } catch (error) {
      setProfileSyncError("Details were not saved to the agency. Please retry.");
      Alert.alert("Could not save profile", error instanceof Error ? error.message : "Check your connection and retry.");
    } finally { setSavingProfile(false); }
  };
  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
    try {
      if (key === "pushAlerts") {
        if (value) {
          const enabled = await enableCaregiverPushNotifications();
          if (!enabled) {
            Alert.alert("Notifications are off", "Enable notifications in iOS settings to receive shift and care-team updates.");
            return;
          }
        } else {
          await disableCaregiverPushNotifications();
        }
      }
      const next = { ...settings, [key]: value };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      setSettings(next);
    } catch {
      Alert.alert("Setting unavailable", "Please try again when your device is online.");
    }
  };

  const renderActivePanel = () => {
    if (!activePanel) return null;

    if (activePanel === "timeOff") {
      return (
        <View style={panelCard}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Time off</Text>
          <Text style={{ color: colors.muted, marginTop: 9, lineHeight: 20 }}>
            Time-off balances and requests are not yet linked to your agency account. Contact your coordinator to request leave or check its status.
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={contactSupport}
            style={{ backgroundColor: "#0A4A35", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 14 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>Request support</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activePanel === "submissions") {
      return (
        <View style={panelCard}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>My submissions</Text>
          <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 8 }}>
            Access your actual submitted timesheets and shared caregiver handovers. No example requests are shown as real records.
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/timesheets")}
            style={{ backgroundColor: "#EAF4EF", padding: 14, borderRadius: 12, marginTop: 14 }}>
            <Text style={{ color: "#0A4A35", fontWeight: "900" }}>My Timesheets →</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/handoff")}
            style={{ backgroundColor: "#EAF4EF", padding: 14, borderRadius: 12, marginTop: 8 }}>
            <Text style={{ color: "#0A4A35", fontWeight: "900" }}>Shared handovers →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activePanel === "shared") {
      return (
        <View style={panelCard}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>Shared with me</Text>
          <Text style={{ color: colors.muted, marginTop: 8, lineHeight: 20 }}>
            Published care-site checklists are available under Tasks. Agency documents that have not been connected are not displayed here.
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/handoff")}
            style={{ backgroundColor: "#EAF4EF", borderRadius: 12, padding: 14, marginTop: 14 }}>
            <Text style={{ color: "#0A4A35", fontWeight: "900" }}>Open shared care checklists →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activePanel === "activity") {
      return (
        <View style={panelCard}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900" }}>My activity</Text>
          <Text style={{ color: colors.muted, marginTop: 9, lineHeight: 20 }}>
            View recorded attendance and the status of actual submitted timesheets in your timekeeping history.
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/clock")}
            style={{ backgroundColor: "#EAF4EF", borderRadius: 12, padding: 14, marginTop: 14 }}>
            <Text style={{ color: "#0A4A35", fontWeight: "900" }}>Open time records →</Text>
          </TouchableOpacity>
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
          {profileSyncError ? <Text accessibilityRole="alert" style={{ color: "#A23831", marginTop: 12, lineHeight: 18 }}>{profileSyncError}</Text> : null}
          <TouchableOpacity accessibilityRole="button" disabled={savingProfile} onPress={() => void saveProfile()} style={{ backgroundColor: savingProfile ? "#9CBBAA" : "#0A4A35", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 14 }}>
            <Text style={{ color: "white", fontWeight: "900" }}>{savingProfile ? "Saving…" : "Save personal information"}</Text>
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
        ].map((item) => (
          <View key={item.key} style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.foreground, fontWeight: "900" }}>{item.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 }}>{item.detail}</Text>
            </View>
            <Switch value={settings[item.key]} onValueChange={(value) => void updateSetting(item.key, value)} />
          </View>
        ))}
        <Text style={{ color: colors.muted, marginTop: 10, fontSize: 12 }}>
          Notification preference is saved on this device. SMS alerts are managed in Incident Reports & SMS.
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 18, paddingBottom: 128 }}>
      <Text style={{ color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }}>ELITE BRIDGE CAREGIVER</Text>
        <Text style={{ fontSize: 30, fontWeight: "900", color: colors.foreground, marginTop: 5 }}>My Profile</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(staff)/operations")} style={{ padding: 16, backgroundColor: "#07533c", borderRadius: 12, marginVertical: 12 }}><Text style={{ color: "#fff", fontWeight: "800" }}>Incident reports & SMS alerts</Text></TouchableOpacity>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 18 }}>Manage your caregiver profile, requests, settings and agency connection.</Text>

      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Upload caregiver profile picture" disabled={uploadingPhoto}
          onPress={() => void chooseProfilePhoto()} style={{ alignSelf: "flex-start", marginBottom: 14 }}>
          {photo ? <Image source={{ uri: photo }} style={{ width: 86, height: 86, borderRadius: 23 }} accessibilityLabel="Your profile picture" /> :
            <View style={{ width: 86, height: 86, borderRadius: 23, backgroundColor: "#0A4A35", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#EBCB8B", fontSize: 25, fontWeight: "900" }}>EB</Text>
            </View>}
          <Text style={{ color: "#075B42", fontSize: 12, fontWeight: "900", marginTop: 8 }}>{uploadingPhoto ? "Uploading…" : "Upload profile photo"}</Text>
        </TouchableOpacity>
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
            { label: "Time off", value: "—" },
            { label: "Sick leave", value: "—" },
            { label: "Unpaid", value: "—" },
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

      <View style={{ marginTop: 14, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowAdvancedAccount((value) => !value)}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>More account options</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Account access, data and profile controls.</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "900" }}>{showAdvancedAccount ? "Hide" : "Open"}</Text>
        </TouchableOpacity>
        {showAdvancedAccount ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900" }}>Close caregiver account</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 }}>Remove your caregiver access and profile after a confirmation step. Required payroll, safety or compliance records may be retained as required by law.</Text>
            <TouchableOpacity disabled={deleting} onPress={deleteAccount} style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "#FDA29B", backgroundColor: "#FFF5F4", padding: 12, alignItems: "center", opacity: deleting ? 0.55 : 1 }}>
              <Text style={{ color: "#B42318", fontWeight: "900", fontSize: 13 }}>{deleting ? "Processing…" : "Continue"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
