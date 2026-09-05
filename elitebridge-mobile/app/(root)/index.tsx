import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const PRIVACY_URL = "https://elitebridgestaffing.com/privacy/";
const TERMS_URL = "https://elitebridgestaffing.com/terms/";
const slides = [
  {
    image: require("../../assets/images/caregiver-welcome-hero.jpg"),
    eyebrow: "CARE THAT FITS YOUR LIFE",
    title: "Meaningful work. Better-fit shifts.",
    body: "Build your profile once and see care opportunities matched to your skills, availability and preferences.",
    highlights: ["Your preferences", "Trusted employers", "Better-fit care"],
  },
  {
    image: require("../../assets/images/caregiver-welcome-match.jpg"),
    eyebrow: "MATCHED SHIFT OFFERS",
    title: "See the details. Claim with confidence.",
    body: "Review schedule, location, pay and care responsibilities together before you apply or instantly claim an eligible shift.",
    highlights: ["Schedule", "Location", "Pay upfront"],
  },
  {
    image: require("../../assets/images/caregiver-welcome-clock.jpg"),
    eyebrow: "YOUR WORKDAY, ONE PLACE",
    title: "Clock in. Care well. Stay organized.",
    body: "Manage assigned visits, location-aware timekeeping, breaks, visit notes, call-outs and timesheet decisions.",
    highlights: ["Time clock", "Breaks", "Timesheets"],
  },
  {
    image: require("../../assets/images/caregiver-welcome-purpose.jpg"),
    eyebrow: "CARE WITH PURPOSE",
    title: "Support that makes every day better.",
    body: "Find opportunities in companionship, personal care, respite and meal support with trusted care organizations.",
    highlights: ["Personal care", "Companionship", "Meal support"],
  },
];

export default function CaregiverWelcomeScreen() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("elitebridge-session")
      .then((stored) => {
        if (!active) return;
        try {
          setSignedIn(Boolean(stored && JSON.parse(stored)?.role === "staff"));
        } catch {
          setSignedIn(false);
        }
        setSessionReady(true);
      })
      .catch(() => active && setSessionReady(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(
      () => setActiveSlide((current) => (current + 1) % slides.length),
      5200,
    );
    return () => clearInterval(timer);
  }, []);

  if (!sessionReady)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#D7A94B" />
      </View>
    );
  if (signedIn) return <Redirect href="/(staff)/home" />;
  const slide = slides[activeSlide];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ImageBackground
        key={activeSlide}
        source={slide.image}
        resizeMode="cover"
        style={styles.hero}
        accessibilityLabel={`${slide.eyebrow}. ${slide.title}`}
      >
        <View style={styles.scrim} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.brandRow}>
            <View style={styles.mark}>
              <Image
                source={require("../../assets/images/elitebridge-logo.png")}
                resizeMode="contain"
                style={styles.logo}
              />
            </View>
            <View>
              <Text style={styles.brand}>ELITE BRIDGE</Text>
              <Text style={styles.product}>CAREGIVER</Text>
            </View>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.body}</Text>
            <View style={styles.dots}>
              {slides.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  accessibilityLabel={`Show caregiver feature ${index + 1}`}
                  onPress={() => setActiveSlide(index)}
                  style={[
                    styles.dot,
                    index === activeSlide && styles.dotActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.services}>
              {slide.highlights.map((service) => (
                <View key={service} style={styles.servicePill}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.actionSheet}>
        <Text style={styles.sheetTitle}>Care professionals start here</Text>
        <Text style={styles.sheetBody}>
          Employers post from the separate Elite Bridge Employer app; qualified
          caregivers receive the matching opportunities here.
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.push("/(onboarding)/welcome")}
          >
            <Text style={styles.secondaryText}>Create profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.primaryText}>Sign in</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.links}>
          <TouchableOpacity onPress={() => void Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.link}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>•</Text>
          <TouchableOpacity onPress={() => void Linking.openURL(TERMS_URL)}>
            <Text style={styles.link}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>•</Text>
          <Text style={styles.caregiverOnly}>Caregiver access only</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#071B14",
    flex: 1,
    justifyContent: "center",
  },
  screen: { flex: 1, backgroundColor: "#071B14" },
  hero: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 20, 14, 0.38)",
  },
  safe: { flex: 1, paddingHorizontal: 24 },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    marginTop: 8,
  },
  mark: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 15,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48,
  },
  logo: { height: 43, width: 43 },
  brand: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  product: {
    color: "#F0CC82",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.5,
    marginTop: 2,
  },
  heroCopy: { marginTop: "auto", paddingBottom: 32 },
  eyebrow: {
    color: "#F0CC82",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 37,
    fontWeight: "900",
    letterSpacing: -1.1,
    lineHeight: 42,
    marginTop: 9,
    maxWidth: 350,
  },
  subtitle: {
    color: "#EFF7F3",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 355,
  },
  dots: { flexDirection: "row", gap: 8, marginTop: 19 },
  dot: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 4,
    height: 5,
    width: 24,
  },
  dotActive: { backgroundColor: "#D7A94B", width: 40 },
  services: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 17 },
  servicePill: {
    backgroundColor: "rgba(4,39,27,0.72)",
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serviceText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  actionSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  sheetTitle: {
    color: "#101828",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  sheetBody: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 10,
    marginTop: 5,
    textAlign: "center",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  primary: {
    alignItems: "center",
    backgroundColor: "#0A4A35",
    borderRadius: 15,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    marginTop: 16,
  },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  secondary: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#0A4A35",
    borderRadius: 15,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    marginTop: 16,
  },
  secondaryText: { color: "#0A4A35", fontSize: 15, fontWeight: "900" },
  links: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 13,
  },
  link: { color: "#0A4A35", fontSize: 11, fontWeight: "800" },
  linkDivider: { color: "#98A2B3", marginHorizontal: 7 },
  caregiverOnly: { color: "#667085", fontSize: 10, fontWeight: "700" },
});
