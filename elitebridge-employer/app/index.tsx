import { useEffect, useState } from "react";
import { Image, ImageBackground, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "../lib/theme";
import { warmEmployerService } from "../lib/api";

const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const TERMS_URL = "https://elitebridgestaffing.com/terms/";
const slides = [
  { image: require("../assets/images/employer-welcome-hero.jpg"), eyebrow: "SMARTER CARE STAFFING", title: "Fill the right shift—faster.", body: "Create an opportunity once and reach active caregivers whose profile matches your care needs." },
  { image: require("../assets/images/employer-welcome-matches.jpg"), eyebrow: "MATCHED SHIFT OFFERS", title: "Post once. Notify every qualified match.", body: "Schedule, location, pay and responsibilities arrive together in Elite Bridge Caregiver." },
  { image: require("../assets/images/employer-welcome-review.jpg"), eyebrow: "YOUR WORKFORCE, YOUR RULES", title: "Choose speed or hands-on approval.", body: "Use Instant claim for urgent coverage or Review first when you want to select the caregiver." },
  { image: require("../assets/images/employer-welcome-operations.jpg"), eyebrow: "CONNECTED OPERATIONS", title: "Stay informed from post to placement.", body: "Track applicants, claimed shifts, call-outs and staffing notifications from one employer workspace." },
];

export default function EmployerWelcomeScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    void warmEmployerService();
    const timer = setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 5200);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[activeSlide];
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ImageBackground source={slide.image} resizeMode="cover" style={styles.hero}>
        <View style={styles.scrim} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.brandRow}>
            <Image source={require("../assets/images/icon.png")} resizeMode="cover" style={styles.logo} accessibilityLabel="Elite Bridge Employer logo" />
            <View><Text style={styles.brand}>ELITE BRIDGE</Text><Text style={styles.product}>EMPLOYER</Text></View>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.body}</Text>
            <View style={styles.dots}>
              {slides.map((_, index) => <TouchableOpacity key={index} accessibilityLabel={`Show employer feature ${index + 1}`} onPress={() => setActiveSlide(index)} style={[styles.dot, index === activeSlide && styles.dotActive]} />)}
            </View>
            <View style={styles.services}>
              {["Personal care", "Companionship", "Respite", "Meal support"].map((service) => <View key={service} style={styles.servicePill}><Text style={styles.serviceText}>{service}</Text></View>)}
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <SafeAreaView edges={["bottom"]} style={styles.actionSheet}>
        <Text style={styles.sheetTitle}>Care organizations start here</Text>
        <Text style={styles.sheetBody}>A dedicated employer app connected to the separately listed Elite Bridge Caregiver app.</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondary} onPress={() => router.push("/register")}><Text style={styles.secondaryText}>Sign up</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primary} onPress={() => router.push("/sign-in")}><Text style={styles.primaryText}>Log in</Text></TouchableOpacity>
        </View>
        <View style={styles.links}>
          <TouchableOpacity onPress={() => void Linking.openURL(PRIVACY_URL)}><Text style={styles.link}>Privacy</Text></TouchableOpacity>
          <Text style={styles.linkDivider}>•</Text>
          <TouchableOpacity onPress={() => void Linking.openURL(TERMS_URL)}><Text style={styles.link}>Terms</Text></TouchableOpacity>
          <Text style={styles.linkDivider}>•</Text>
          <Text style={styles.employerOnly}>Employer access only</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071B14" }, hero: { flex: 1 }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3, 20, 14, 0.18)" }, safe: { flex: 1, paddingHorizontal: 24 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 11, marginTop: 8 }, logo: { backgroundColor: "#FFFFFF", borderRadius: 15, height: 48, width: 48 }, brand: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 1.5 }, product: { color: "#F0CC82", fontSize: 10, fontWeight: "900", letterSpacing: 2.5, marginTop: 2 },
  heroCopy: { marginTop: "auto", paddingBottom: 32 }, eyebrow: { color: "#F0CC82", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 }, title: { color: "#FFFFFF", fontSize: 37, fontWeight: "900", letterSpacing: -1.1, lineHeight: 42, marginTop: 9, maxWidth: 350 }, subtitle: { color: "#EFF7F3", fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 355 },
  dots: { flexDirection: "row", gap: 8, marginTop: 19 }, dot: { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 4, height: 5, width: 24 }, dotActive: { backgroundColor: "#D7A94B", width: 40 }, services: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 17 }, servicePill: { backgroundColor: "rgba(4,39,27,0.72)", borderColor: "rgba(255,255,255,0.35)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 }, serviceText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  actionSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, paddingBottom: 16, paddingHorizontal: 22, paddingTop: 18 }, sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", textAlign: "center" }, sheetBody: { color: colors.muted, fontSize: 12, lineHeight: 18, marginHorizontal: 12, marginTop: 5, textAlign: "center" }, actionRow: { flexDirection: "row", gap: 10 }, primary: { alignItems: "center", backgroundColor: colors.green, borderRadius: 15, flex: 1, justifyContent: "center", minHeight: 52, marginTop: 14 }, primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" }, secondary: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: colors.green, borderRadius: 15, borderWidth: 1.5, flex: 1, justifyContent: "center", minHeight: 52, marginTop: 14 }, secondaryText: { color: colors.green, fontSize: 15, fontWeight: "900" },
  links: { alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 13 }, link: { color: colors.green, fontSize: 11, fontWeight: "800" }, linkDivider: { color: "#98A2B3", marginHorizontal: 7 }, employerOnly: { color: "#667085", fontSize: 10, fontWeight: "700" },
});
