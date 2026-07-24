import { ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Admin Profile Screen - View and manage admin account
 */
export default function AdminProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { logout } = useAuth();

  const adminInfo = {
    name: "Administrator",
    email: "admin@elitebridge.com",
    facility: "Elite Bridge Staffing",
    role: "Facility Manager",
    joinDate: "January 2024",
    shiftsPosted: 24,
    staffManaged: 156,
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(tabs)/login");
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 24,
    },
    header: {
      gap: 8,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 16,
      alignItems: "center",
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 32,
      fontWeight: "bold",
      color: colors.background,
    },
    profileName: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.foreground,
    },
    profileRole: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
    },
    profileEmail: {
      fontSize: 13,
      color: colors.muted,
    },
    statsContainer: {
      flexDirection: "row",
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      gap: 6,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.muted,
      textAlign: "center",
    },
    infoSection: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.foreground,
    },
    infoItem: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "500",
    },
    infoValue: {
      fontSize: 14,
      color: colors.foreground,
      fontWeight: "600",
    },
    logoutButton: {
      backgroundColor: colors.error,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.background,
    },
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your account</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <Text style={styles.profileName}>{adminInfo.name}</Text>
            <Text style={styles.profileRole}>{adminInfo.role}</Text>
            <Text style={styles.profileEmail}>{adminInfo.email}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{adminInfo.shiftsPosted}</Text>
              <Text style={styles.statLabel}>Shifts Posted</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{adminInfo.staffManaged}</Text>
              <Text style={styles.statLabel}>Staff Managed</Text>
            </View>
          </View>

          {/* Account Information */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Facility</Text>
              <Text style={styles.infoValue}>{adminInfo.facility}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{adminInfo.joinDate}</Text>
            </View>
          </View>

          {/* Logout Button */}
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
