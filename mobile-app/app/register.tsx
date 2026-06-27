import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandHeader } from "../src/components/BrandHeader";
import { api } from "../src/api";
import { colors } from "../src/theme";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!firstName || !lastName || !companyName || !email || passcode.length < 8) {
      Alert.alert("Missing info", "Fill all required fields. Passcode must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.register({ firstName, lastName, companyName, email: email.trim(), phone, password: passcode });
      router.replace("/dashboard");
    } catch (error: any) {
      Alert.alert("Account failed", error.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <BrandHeader subtitle="Create employer account" />
          <TextInput style={styles.input} placeholder="Company Name" value={companyName} onChangeText={setCompanyName} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="First Name" value={firstName} onChangeText={setFirstName} />
            <TextInput style={[styles.input, styles.half]} placeholder="Last Name" value={lastName} onChangeText={setLastName} />
          </View>
          <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput style={styles.input} placeholder="Passcode, min 8 characters" secureTextEntry value={passcode} onChangeText={setPasscode} />
          <Pressable style={styles.button} onPress={register} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Create Account</Text>}
          </Pressable>
          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.link}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.green },
  content: { padding: 20, justifyContent: "center", flexGrow: 1 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, gap: 14 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 16 },
  button: { backgroundColor: colors.gold, padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  link: { color: colors.gold, textAlign: "center", fontWeight: "700" },
});
