import { ScrollView, Text, View, StyleSheet, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

/**
 * User Profile Screen - View and edit profile
 * Phase 2: Enhanced styling with profile information
 */
export default function UserProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 24,
    },
    profileHeader: {
      alignItems: "center",
      gap: 12,
      paddingVertical: 24,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 36,
      fontWeight: "bold",
      color: colors.background,
    },
    nameText: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.foreground,
    },
    emailText: {
      fontSize: 14,
      color: colors.muted,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    infoLabel: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: "500",
    },
    infoValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    ratingText: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
    },
    ratingLabel: {
      fontSize: 14,
      color: colors.muted,
    },
    logoutButton: {
      backgroundColor: colors.error,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 12,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: "600",
      color: "white",
    },
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "U"}</Text>
            </View>
            <Text style={styles.nameText}>{user?.name || "User"}</Text>
            <Text style={styles.emailText}>{user?.email || "user@example.com"}</Text>
          </View>

          {/* Profile Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || "Not provided"}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role === "admin" ? "Administrator" : "Staff Member"}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistics</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Completed Shifts</Text>
              <Text style={styles.infoValue}>12</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.ratingContainer}>
                <Text style={styles.infoLabel}>Rating</Text>
                <Text style={styles.ratingText}>4.8 ⭐</Text>
              </View>
              <Text style={styles.ratingLabel}>Based on 12 completed shifts</Text>
            </View>
          </View>

          {/* Logout Button */}
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
