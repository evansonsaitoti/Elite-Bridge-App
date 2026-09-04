import { useCallback, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { getStoredEmployer } from "../lib/api";
import { cardShadow, colors } from "../lib/theme";

const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const TERMS_URL = "https://elitebridgestaffing.com/terms/";

export default function WelcomeScreen() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    getStoredEmployer().then((user) => active && setSignedIn(Boolean(user)));
    return () => { active = false; };
  }, []));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.mark}><Text style={styles.markText}>EB</Text></View>
          <View><Text style={styles.brand}>ELITE BRIDGE</Text><Text style={styles.product}>EMPLOYER</Text></View>
        </View>

        <Text style={styles.eyebrow}>FOR CARE ORGANIZATIONS</Text>
        <Text style={styles.title}>Post care opportunities. Build your workforce.</Text>
        <Text style={styles.subtitle}>
          A dedicated employer app for agencies and organizations that hire caregivers through the Elite Bridge marketplace.
        </Text>

        <View style={styles.actions}>
          {signedIn ? (
            <TouchableOpacity style={styles.primary} onPress={() => router.push("/dashboard")}>
              <Text style={styles.primaryText}>Open employer workspace</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.primary} onPress={() => router.push("/register")}>
                <Text style={styles.primaryText}>Create employer account</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={() => router.push("/sign-in")}>
                <Text style={styles.secondaryText}>Sign in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.relationshipCard}>
          <Text style={styles.relationshipTitle}>Two apps. One connected marketplace.</Text>
          <View style={styles.flowRow}><Text style={styles.step}>1</Text><View style={styles.flowCopy}><Text style={styles.flowTitle}>Employers post shifts here</Text><Text style={styles.flowBody}>Create care opportunities with schedule, location, requirements and pay.</Text></View></View>
          <View style={styles.line} />
          <View style={styles.flowRow}><Text style={styles.step}>2</Text><View style={styles.flowCopy}><Text style={styles.flowTitle}>Matched caregivers are notified</Text><Text style={styles.flowBody}>Eligible workers receive the Shift Offer in the separately listed Elite Bridge Caregiver app.</Text></View></View>
          <View style={styles.line} />
          <View style={styles.flowRow}><Text style={styles.step}>3</Text><View style={styles.flowCopy}><Text style={styles.flowTitle}>Choose the assignment method</Text><Text style={styles.flowBody}>Allow the first qualified caregiver to claim, or review applicants before assigning.</Text></View></View>
        </View>

        <View style={styles.disclosure}>
          <Text style={styles.disclosureTitle}>This app is only for employers</Text>
          <Text style={styles.disclosureText}>Caregivers use the separately listed Elite Bridge Caregiver app. Employer credentials cannot unlock the caregiver application.</Text>
        </View>

        <View style={styles.links}>
          <TouchableOpacity onPress={() => void Linking.openURL(PRIVACY_URL)}><Text style={styles.link}>Privacy Policy</Text></TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <TouchableOpacity onPress={() => void Linking.openURL(TERMS_URL)}><Text style={styles.link}>Terms of Use</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 44 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 42 },
  mark: { alignItems: "center", backgroundColor: colors.green, borderRadius: 17, height: 54, justifyContent: "center", width: 54 },
  markText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  brand: { color: colors.green, fontSize: 15, fontWeight: "900", letterSpacing: 1.5 },
  product: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 2.4, marginTop: 2 },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 36, fontWeight: "900", letterSpacing: -1.1, lineHeight: 42, marginTop: 10 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 14 },
  actions: { gap: 10, marginVertical: 26 },
  primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, minHeight: 54, justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  secondary: { alignItems: "center", backgroundColor: colors.card, borderColor: colors.green, borderRadius: 14, borderWidth: 1.5, minHeight: 54, justifyContent: "center" },
  secondaryText: { color: colors.green, fontSize: 16, fontWeight: "900" },
  relationshipCard: { ...cardShadow, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, padding: 18 },
  relationshipTitle: { color: colors.ink, fontSize: 19, fontWeight: "900", marginBottom: 17 },
  flowRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  step: { backgroundColor: colors.greenSoft, borderRadius: 18, color: colors.green, fontSize: 13, fontWeight: "900", overflow: "hidden", paddingHorizontal: 11, paddingVertical: 6 },
  flowCopy: { flex: 1 },
  flowTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  flowBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  line: { backgroundColor: colors.border, height: 1, marginVertical: 15, marginLeft: 44 },
  disclosure: { backgroundColor: colors.greenSoft, borderRadius: 16, marginTop: 16, padding: 15 },
  disclosureTitle: { color: colors.greenDark, fontSize: 14, fontWeight: "900" },
  disclosureText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  links: { alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { color: colors.green, fontSize: 12, fontWeight: "800" },
  dot: { color: colors.muted, marginHorizontal: 10 },
});
