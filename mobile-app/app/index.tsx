import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { BrandHeader } from "../src/components/BrandHeader";
import { api } from "../src/api";
import { colors } from "../src/theme";

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.getStoredUser().then((user) => {
      if (user) router.replace("/dashboard");
    }).finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BrandHeader />
        <Text style={styles.heading}>Employer mobile app</Text>
        <Text style={styles.copy}>Post caregiver shifts, track open requests, and manage staffing from your phone.</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.push("/register")}>
          <Text style={styles.primaryText}>Create Account</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push("/login")}>
          <Text style={styles.secondaryText}>Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.green, justifyContent: "center", padding: 20 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, gap: 18 },
  heading: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 18 },
  copy: { fontSize: 16, color: colors.muted, lineHeight: 24 },
  primaryButton: { backgroundColor: colors.gold, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 10 },
  primaryText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  secondaryButton: { borderColor: colors.green, borderWidth: 1, padding: 16, borderRadius: 14, alignItems: "center" },
  secondaryText: { color: colors.green, fontWeight: "800", fontSize: 16 },
});
