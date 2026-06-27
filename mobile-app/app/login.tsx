import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandHeader } from "../src/components/BrandHeader";
import { api } from "../src/api";
import { colors } from "../src/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await api.login(email.trim(), password);
      router.replace("/dashboard");
    } catch (error: any) {
      Alert.alert("Sign in failed", error.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <BrandHeader subtitle="Employer Sign In" />
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Pressable style={styles.button} onPress={login} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>
        <Pressable onPress={() => router.push("/register")}>
          <Text style={styles.link}>Create a new account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.green, justifyContent: "center", padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, gap: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 16 },
  button: { backgroundColor: colors.gold, padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  link: { color: colors.gold, textAlign: "center", fontWeight: "700" },
});
