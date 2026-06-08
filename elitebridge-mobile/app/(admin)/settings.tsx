import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

/**
 * Admin Settings Screen - Configuration and preferences
 */
export default function AdminSettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      gap: 24,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    adminCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    adminLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
    },
    adminName: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    adminEmail: {
      fontSize: 13,
      color: colors.muted,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 4,
    },
    settingItem: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingText: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.foreground,
    },
    arrow: {
      fontSize: 16,
      color: colors.muted,
    },
    logoutButton: {
      backgroundColor: colors.error,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: 8,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.background,
    },
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your account and preferences</Text>
        </View>

        {/* Admin Info Card */}
        <View style={styles.adminCard}>
          <Text style={styles.adminLabel}>Admin Account</Text>
          <Text style={styles.adminName}>{user?.name || "Administrator"}</Text>
          <Text style={styles.adminEmail}>{user?.email || "admin@elitebridge.com"}</Text>
        </View>

        {/* Account Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Edit Profile</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Change Password</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Company Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Company Information</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Locations</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Payment Methods</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Notifications</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Privacy & Security</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Help & Documentation</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Contact Support</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
