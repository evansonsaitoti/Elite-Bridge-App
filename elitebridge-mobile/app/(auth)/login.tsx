import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";

type LoginRole = "administrator" | "staff";

const DEMO_ACCOUNTS = {
  administrator: {
    email: "admin@elitebridge.com",
    password: "Admin123!",
    destination: "/(admin)/home" as const,
  },
  staff: {
    email: "staff@elitebridge.com",
    password: "Staff123!",
    destination: "/(staff)/home" as const,
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("administrator");
  const [email, setEmail] = useState(DEMO_ACCOUNTS.administrator.email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS.administrator.password);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const chooseRole = (nextRole: LoginRole) => {
    setRole(nextRole);
    setEmail(DEMO_ACCOUNTS[nextRole].email);
    setPassword(DEMO_ACCOUNTS[nextRole].password);
    setError("");
  };

  const handleLogin = async () => {
    const account = DEMO_ACCOUNTS[role];
    setError("");

    if (!email.trim() || !password) {
      setError("Enter both your email address and password.");
      return;
    }

    if (
      email.trim().toLowerCase() !== account.email.toLowerCase() ||
      password !== account.password
    ) {
      setError(
        `These details do not match the selected ${role} account. Use the demo credentials shown below.`,
      );
      return;
    }

    try {
      setIsLoading(true);
      await AsyncStorage.setItem(
        "elitebridge-session",
        JSON.stringify({ role, email: account.email, signedInAt: new Date().toISOString() }),
      );
      router.replace(account.destination);
    } catch {
      setError("We could not sign you in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const account = DEMO_ACCOUNTS[role];
  const isAdmin = role === "administrator";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>🏥</Text>
        </View>
        <Text style={styles.appName}>Elite Bridge</Text>
        <Text style={styles.tagline}>Choose the portal you are signing into</Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => chooseRole("administrator")}
            style={[styles.roleCard, isAdmin && styles.roleCardSelected]}
          >
            <Text style={styles.roleIcon}>🛡️</Text>
            <Text style={[styles.roleTitle, isAdmin && styles.roleTitleSelected]}>Administrator</Text>
            <Text style={[styles.roleDescription, isAdmin && styles.roleDescriptionSelected]}>
              Manage shifts, staff, applications and timesheets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => chooseRole("staff")}
            style={[styles.roleCard, !isAdmin && styles.roleCardSelected]}
          >
            <Text style={styles.roleIcon}>👤</Text>
            <Text style={[styles.roleTitle, !isAdmin && styles.roleTitleSelected]}>Staff</Text>
            <Text style={[styles.roleDescription, !isAdmin && styles.roleDescriptionSelected]}>
              View shifts, clock in and manage your profile
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.portalBanner}>
          <Text style={styles.portalLabel}>YOU ARE SIGNING IN TO</Text>
          <Text style={styles.portalTitle}>
            {isAdmin ? "Administrator Portal" : "Staff Portal"}
          </Text>
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

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo {isAdmin ? "administrator" : "staff"} login</Text>
            <Text style={styles.demoText}>Email: {account.email}</Text>
            <Text style={styles.demoText}>Password: {account.password}</Text>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>
                Sign in as {isAdmin ? "Administrator" : "Staff"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF" },
  logoBox: { width: 70, height: 70, borderRadius: 18, alignSelf: "center", alignItems: "center", justifyContent: "center", backgroundColor: "#E8F5E9", borderWidth: 2, borderColor: "#1B5E3F", marginTop: 12 },
  logoText: { fontSize: 34 },
  appName: { marginTop: 10, textAlign: "center", fontSize: 28, fontWeight: "800", color: "#1B5E3F" },
  tagline: { marginTop: 5, marginBottom: 22, textAlign: "center", color: "#667085", fontSize: 14 },
  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: { flex: 1, minHeight: 154, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB" },
  roleCardSelected: { borderColor: "#1B5E3F", backgroundColor: "#E8F5E9" },
  roleIcon: { fontSize: 28, marginBottom: 8 },
  roleTitle: { fontSize: 16, fontWeight: "800", color: "#344054" },
  roleTitleSelected: { color: "#1B5E3F" },
  roleDescription: { marginTop: 6, fontSize: 12, lineHeight: 17, color: "#667085" },
  roleDescriptionSelected: { color: "#315D46" },
  portalBanner: { marginTop: 16, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: "#1B5E3F" },
  portalLabel: { color: "#CDE7D8", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  portalTitle: { marginTop: 3, color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  errorBox: { marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: "#FEE4E2" },
  errorText: { color: "#B42318", fontSize: 13, lineHeight: 18 },
  formCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#EAECF0", backgroundColor: "#FFFFFF" },
  label: { marginBottom: 7, fontSize: 13, fontWeight: "700", color: "#344054" },
  input: { height: 48, marginBottom: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", color: "#101828", backgroundColor: "#F9FAFB" },
  passwordRow: { flexDirection: "row", height: 48, marginBottom: 14, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB", overflow: "hidden" },
  passwordInput: { flex: 1, paddingHorizontal: 12, color: "#101828" },
  showButton: { width: 66, alignItems: "center", justifyContent: "center" },
  showText: { color: "#1B5E3F", fontWeight: "700" },
  demoBox: { marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: "#F2F4F7" },
  demoTitle: { marginBottom: 5, fontSize: 12, fontWeight: "800", color: "#344054" },
  demoText: { fontSize: 12, lineHeight: 18, color: "#475467" },
  loginButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#1B5E3F" },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
