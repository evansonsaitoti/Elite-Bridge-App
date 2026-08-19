import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getAgencyProfile, saveAgencyProfile, type AgencyProfile } from "../lib/employer-storage";

const TYPES: AgencyProfile["agencyType"][] = ["Home Care Agency", "Staffing Agency", "Home Health Agency", "Other"];
const EMPTY_PROFILE: AgencyProfile = {
  agencyName: "",
  agencyType: "Home Care Agency",
  city: "",
  state: "MA",
  employeeCount: "1–10",
  medicaidPrograms: false,
  evvRequired: false,
};

export default function AgencySetup() {
  const router = useRouter();
  const [profile, setProfile] = useState<AgencyProfile>(EMPTY_PROFILE);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getAgencyProfile().then((saved) => {
      if (!saved) return;
      setProfile(saved);
      setEditing(true);
    });
  }, []);

  const save = async () => {
    if (!profile.agencyName.trim() || !profile.city.trim()) return Alert.alert("Missing information", "Enter the agency name and primary city.");
    await saveAgencyProfile({
      ...profile,
      agencyName: profile.agencyName.trim(),
      city: profile.city.trim(),
      state: profile.state.trim().toUpperCase() || "MA",
    });
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{editing ? "AGENCY PROFILE" : "EMPLOYER SIGN UP"}</Text>
          <Text style={styles.title}>{editing ? "Keep your agency profile current." : "Set up your care agency workspace."}</Text>
          <Text style={styles.sub}>Create a professional employer profile so Elite Bridge can tailor scheduling, staffing and operations tools to your care organization.</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Setup takes about 2 minutes</Text>
          <Text style={styles.progressText}>Add agency basics now. You can update programs, team size and EVV requirements later.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agency details</Text>
          <Text style={styles.cardSub}>Use the name clients and caregivers recognize.</Text>
          <Text style={styles.label}>Agency name</Text>
          <TextInput style={styles.input} value={profile.agencyName} onChangeText={(agencyName) => setProfile({ ...profile, agencyName })} placeholder="Your agency name" placeholderTextColor="#98A2B3" />
          <Text style={styles.label}>Agency type</Text>
          <View style={styles.chips}>{TYPES.map((type) => <TouchableOpacity key={type} onPress={() => setProfile({ ...profile, agencyType: type })} style={[styles.chip, profile.agencyType === type && styles.chipActive]}><Text style={[styles.chipText, profile.agencyType === type && styles.chipTextActive]}>{type}</Text></TouchableOpacity>)}</View>
          <Text style={styles.label}>Primary city</Text>
          <TextInput style={styles.input} value={profile.city} onChangeText={(city) => setProfile({ ...profile, city })} placeholder="City" placeholderTextColor="#98A2B3" />
          <Text style={styles.label}>State</Text>
          <TextInput style={styles.input} value={profile.state} onChangeText={(state) => setProfile({ ...profile, state })} placeholder="MA" placeholderTextColor="#98A2B3" autoCapitalize="characters" maxLength={2} />
          <Text style={styles.label}>Team size</Text>
          <View style={styles.chips}>{["1–10", "11–25", "26–50", "51+"].map((count) => <TouchableOpacity key={count} onPress={() => setProfile({ ...profile, employeeCount: count })} style={[styles.chip, profile.employeeCount === count && styles.chipActive]}><Text style={[styles.chipText, profile.employeeCount === count && styles.chipTextActive]}>{count}</Text></TouchableOpacity>)}</View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Programs & visit verification</Text>
          <Text style={styles.sectionSub}>These answers change which operational, compliance and EVV prompts Elite surfaces.</Text>
          <Toggle label="We serve Medicaid-funded programs" value={profile.medicaidPrograms} onPress={() => setProfile({ ...profile, medicaidPrograms: !profile.medicaidPrograms })} />
          <Toggle label="Our services require EVV" value={profile.evvRequired} onPress={() => setProfile({ ...profile, evvRequired: !profile.evvRequired })} />
        </View>

        <View style={styles.aiBox}><Text style={styles.aiEyebrow}>WHY THIS MATTERS</Text><Text style={styles.aiText}>Different care organizations manage different staffing, scheduling and documentation needs. Elite uses your profile to surface relevant review items instead of one generic checklist.</Text></View>

        <TouchableOpacity onPress={save} style={styles.primary}><Text style={styles.primaryText}>{editing ? "Save agency profile" : "Finish agency setup"}</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><View style={[styles.toggle, value && styles.toggleOn]}><View style={[styles.knob, value && styles.knobOn]} /></View></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F7F5" }, content: { padding: 20, paddingBottom: 48 },
  hero: { backgroundColor: "#0A4A35", borderRadius: 24, marginBottom: 14, padding: 20 },
  eyebrow: { color: "#EBCB8B", fontWeight: "900", letterSpacing: 1.5, fontSize: 10 },
  title: { color: "#FFFFFF", fontSize: 30, lineHeight: 36, fontWeight: "900", marginTop: 8 }, sub: { color: "#D9E9E2", lineHeight: 21, marginTop: 8 },
  progressCard: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC", borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 14 },
  progressTitle: { color: "#101828", fontSize: 15, fontWeight: "900" },
  progressText: { color: "#667085", fontSize: 13, lineHeight: 19, marginTop: 4 },
  card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 22, padding: 18, marginBottom: 14 },
  cardTitle: { color: "#101828", fontSize: 20, fontWeight: "900" },
  cardSub: { color: "#667085", lineHeight: 20, marginTop: 4, marginBottom: 8 },
  label: { color: "#344054", fontWeight: "800", marginTop: 7, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 14, padding: 13, color: "#101828", backgroundColor: "#F9FAFB" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#F9FAFB", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 }, chipActive: { backgroundColor: "#EAF4EF", borderColor: "#0A4A35" },
  chipText: { color: "#475467", fontWeight: "700", fontSize: 12 }, chipTextActive: { color: "#0A4A35" }, sectionTitle: { color: "#101828", fontWeight: "900", fontSize: 18 }, sectionSub: { color: "#667085", lineHeight: 19, marginTop: 5, marginBottom: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: "#F2F4F7" }, toggleLabel: { color: "#344054", fontWeight: "700", flex: 1, paddingRight: 12 },
  toggle: { width: 48, height: 28, borderRadius: 999, backgroundColor: "#D0D5DD", padding: 3 }, toggleOn: { backgroundColor: "#0A4A35" }, knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "white" }, knobOn: { marginLeft: 20 },
  aiBox: { backgroundColor: "#0A4A35", borderRadius: 18, padding: 16, marginBottom: 14 }, aiEyebrow: { color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }, aiText: { color: "white", marginTop: 7, lineHeight: 21 },
  primary: { backgroundColor: "#0A4A35", borderRadius: 14, padding: 16, alignItems: "center" }, primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
});
