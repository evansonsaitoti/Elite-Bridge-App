import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import * as Auth from "@/lib/_core/auth";
import { eliteBridgeApi } from "@/lib/elite-bridge-api";

type LoginRole = "administrator" | "staff";

export default function LoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("administrator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const chooseRole = (nextRole: LoginRole) => {
    setRole(nextRole);
    setError("");
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter both your email address and password.");
      return;
    }
    try {
      setIsLoading(true);
      const result = await eliteBridgeApi.login(email.trim(), password);
      const expectedRole = role === "administrator" ? "employer" : "caregiver";
      if (result.user.role !== expectedRole) {
        setError(`This account is registered as a ${result.user.role}. Choose the matching portal and try again.`);
        return;
      }
      const appRole = result.user.role === "employer" ? "admin" : "user";
      await Auth.setSessionToken(result.token);
      await Auth.setUserInfo({
        id: result.user.id,
        openId: `elitebridge_${result.user.id}`,
        name: `${result.user.firstName} ${result.user.lastName}`.trim(),
        email: result.user.email,
        loginMethod: "email",
        lastSignedIn: new Date(),
        role: appRole,
        onboardingCompleted: true,
      });
      await AsyncStorage.setItem(
        "elitebridge-session",
        JSON.stringify({ role, email: result.user.email, userId: result.user.id, signedInAt: new Date().toISOString() }),
      );
      router.replace(role === "administrator" ? "/(admin)/home" : "/(staff)/home");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "We could not sign you in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = role === "administrator";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          source={require("../../assets/images/elitebridge-logo.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Elite Bridge logo"
        />
        <Text style={styles.slogan}>STAFFING YOU CAN RELY ON</Text>
        <Text style={styles.tagline}>Choose the portal you are signing into</Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: isAdmin }}
            onPress={() => chooseRole("administrator")}
            style={[styles.roleCard, isAdmin && styles.roleCardSelected]}
          >
            <Text style={styles.roleEyebrow}>AGENCY</Text>
            <Text style={[styles.roleTitle, isAdmin && styles.roleTitleSelected]}>Employer</Text>
            <Text style={[styles.roleDescription, isAdmin && styles.roleDescriptionSelected]}>
              Manage shifts, staff, applications and timesheets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: !isAdmin }}
            onPress={() => chooseRole("staff")}
            style={[styles.roleCard, !isAdmin && styles.roleCardSelected]}
          >
            <Text style={styles.roleEyebrow}>CAREGIVER</Text>
            <Text style={[styles.roleTitle, !isAdmin && styles.roleTitleSelected]}>Caregiver</Text>
            <Text style={[styles.roleDescription, !isAdmin && styles.roleDescriptionSelected]}>
              View shifts, clock in and manage your profile
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.portalBanner}>
          <Text style={styles.portalLabel}>YOU ARE SIGNING IN TO</Text>
          <Text style={styles.portalTitle}>{isAdmin ? "Employer Portal" : "Caregiver Portal"}</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
            placeholder="name@elitebridge.com"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              placeholder="Enter password"
            />
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.showButton}>
              <Text style={styles.showText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign in as {isAdmin ? "Employer" : "Caregiver"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF" },
  logo: { width: 118, height: 118, alignSelf: "center", marginTop: 8 },
  slogan: { textAlign: "center", color: "#C58A24", fontSize: 11, fontWeight: "800", letterSpacing: 2.1 },
  tagline: { marginTop: 8, marginBottom: 22, textAlign: "center", color: "#667085", fontSize: 14 },
  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: { flex: 1, minHeight: 150, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB" },
  roleCardSelected: { borderColor: "#0A4A35", backgroundColor: "#EAF4EF" },
  roleEyebrow: { color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8 },
  roleTitle: { fontSize: 16, fontWeight: "800", color: "#344054" },
  roleTitleSelected: { color: "#0A4A35" },
  roleDescription: { marginTop: 6, fontSize: 12, lineHeight: 17, color: "#667085" },
  roleDescriptionSelected: { color: "#315D46" },
  portalBanner: { marginTop: 16, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: "#0A4A35", borderBottomWidth: 4, borderBottomColor: "#C58A24" },
  portalLabel: { color: "#D5E8DF", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  portalTitle: { marginTop: 3, color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  errorBox: { marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: "#FEE4E2" },
  errorText: { color: "#B42318", fontSize: 13, lineHeight: 18 },
  formCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#EAECF0", backgroundColor: "#FFFFFF" },
  label: { marginBottom: 7, fontSize: 13, fontWeight: "700", color: "#344054" },
  input: { height: 48, marginBottom: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", color: "#101828", backgroundColor: "#F9FAFB" },
  passwordRow: { flexDirection: "row", height: 48, marginBottom: 14, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB", overflow: "hidden" },
  passwordInput: { flex: 1, paddingHorizontal: 12, color: "#101828" },
  showButton: { width: 66, alignItems: "center", justifyContent: "center" },
  showText: { color: "#0A4A35", fontWeight: "700" },
  demoBox: { marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: "#F2F4F7" },
  demoTitle: { marginBottom: 5, fontSize: 12, fontWeight: "800", color: "#344054" },
  demoText: { fontSize: 12, lineHeight: 18, color: "#475467" },
  loginButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#0A4A35" },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
