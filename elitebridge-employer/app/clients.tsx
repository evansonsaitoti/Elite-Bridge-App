import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createEmployerClientLocation, getEmployerClientLocations, getStoredEmployer, type EmployerClientLocation, type EmployerClientLocationInput } from "../lib/api";
import { EmployerTabBar } from "../components/employer-tab-bar";
import { colors } from "../lib/theme";

const empty: EmployerClientLocationInput = {
  clientName: "", locationName: "", address: "", city: "", state: "MA", zipCode: "",
  contactName: "", contactPhone: "", billingRate: 0, caregiverRate: 0, notes: "",
};

export default function ClientsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<EmployerClientLocation[]>([]);
  const [form, setForm] = useState<EmployerClientLocationInput>(empty);
  const [billingInput, setBillingInput] = useState("");
  const [caregiverInput, setCaregiverInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (!await getStoredEmployer()) { router.replace("/sign-in"); return; }
      const clients = await getEmployerClientLocations();
      setItems(clients);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load clients.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [router]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const update = (key: keyof EmployerClientLocationInput, value: string) =>
    setForm(previous => ({ ...previous, [key]: value }));

  const save = async () => {
    if (busy) return;
    const billingRate = Number(billingInput);
    const caregiverRate = Number(caregiverInput);
    if (!form.clientName.trim() || !form.locationName.trim() || !form.city.trim() || !/^[A-Za-z]{2}$/.test(form.state) ||
        !billingInput.trim() || !caregiverInput.trim() || !Number.isFinite(billingRate) || billingRate <= 0 ||
        !Number.isFinite(caregiverRate) || caregiverRate <= 0) {
      Alert.alert("Complete client record", "Enter the client, care location, city, two-letter state and positive billing and caregiver rates.");
      return;
    }
    setBusy(true);
    try {
      const item = await createEmployerClientLocation({ ...form, billingRate, caregiverRate, state: form.state.toUpperCase() });
      setItems(previous => [...previous, item].sort((a,b) => a.clientName.localeCompare(b.clientName)));
      setEditing(false); setForm(empty); setBillingInput(""); setCaregiverInput(""); setError("");
      Alert.alert("Client record saved", "This client location is saved in your secure employer workspace.");
    } catch (reason) {
      Alert.alert("Client not saved", reason instanceof Error ? reason.message : "Check your connection and try again.");
    } finally { setBusy(false); }
  };

  const input = (key: keyof EmployerClientLocationInput, label: string, placeholder: string, opts: { numeric?: boolean; multiline?: boolean } = {}) => (
    <View style={{ marginTop: 13 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} value={String(form[key] || "")}
        onChangeText={value => update(key, value)}
        placeholder={placeholder} placeholderTextColor="#809186"
        keyboardType={opts.numeric ? "decimal-pad" : "default"}
        multiline={opts.multiline} autoCorrect={false}
        style={[styles.input, opts.multiline && styles.multiline]} />
    </View>
  );

  return <SafeAreaView edges={["bottom"]} style={styles.safe}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Client records</Text>
          <Text style={styles.sub}>Your agency's saved care locations, schedules and rates.</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={() => setEditing(value => !value)} style={styles.add}>
          <Ionicons name={editing ? "close-outline" : "add"} size={21} color="#FFFFFF" />
          <Text style={styles.addText}>{editing ? "Close" : "Add client"}</Text>
        </TouchableOpacity>
      </View>
      {error ? <View style={styles.error}><Text accessibilityRole="alert" style={{ color: "#9B2F24" }}>{error}</Text></View> : null}
      {editing ? <View style={styles.form}>
        <Text style={styles.sectionTitle}>New client location</Text>
        <Text style={styles.info}>Only information saved to your employer account is shown here. Avoid entering clinical details or access codes.</Text>
        {input("clientName", "Client name", "Name")}
        {input("locationName", "Location label", "Main residence")}
        {input("address", "Street address", "Street")}
        {input("city", "City", "City")}
        {input("state", "State", "MA")}
        {input("zipCode", "ZIP", "01852")}
        {input("contactName", "On-site contact", "Optional")}
        {input("contactPhone", "Contact phone", "Optional")}
        <View style={{ marginTop: 13 }}><Text style={styles.label}>Client billing rate per hour ($)</Text><TextInput accessibilityLabel="Client billing rate" value={billingInput} onChangeText={setBillingInput} keyboardType="decimal-pad" placeholder="35.00" placeholderTextColor="#809186" style={styles.input}/></View>
        <View style={{ marginTop: 13 }}><Text style={styles.label}>Caregiver pay rate per hour ($)</Text><TextInput accessibilityLabel="Caregiver hourly rate" value={caregiverInput} onChangeText={setCaregiverInput} keyboardType="decimal-pad" placeholder="25.00" placeholderTextColor="#809186" style={styles.input}/></View>
        {input("notes", "Operational notes", "Nonclinical care and schedule notes", { multiline: true })}
        <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={() => void save()} style={[styles.primary, busy && { opacity: 0.6 }]}>
          <Text style={styles.primaryText}>{busy ? "Saving…" : "Save client record"}</Text>
        </TouchableOpacity>
      </View> : null}
      <View style={styles.row}>
        <Text style={styles.sectionTitle}>Saved clients</Text>
        <Text style={styles.count}>{items.length} locations</Text>
      </View>
      {loading && !items.length ? <ActivityIndicator color={colors.green} style={{ marginVertical: 20 }} /> : null}
      {!loading && !items.length && !error ? <View style={styles.empty}>
        <Ionicons name="people-outline" size={43} color={colors.green} />
        <Text style={styles.sectionTitle}>No client locations yet</Text>
        <Text style={styles.info}>Add a client to begin organizing care and staff assignments. Existing web records appear automatically.</Text>
      </View> : null}
      {items.map(item => <View key={item.id} style={styles.client}>
        <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded(current => current === item.id ? null : item.id)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.avatar}><Ionicons name="heart-outline" color={colors.green} size={27}/></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{item.clientName}</Text>
            <Text style={styles.sub}>{item.locationName} · {item.city}, {item.state}</Text>
          </View>
          <Ionicons name={expanded === item.id ? "chevron-up" : "chevron-down"} size={21} color={colors.green}/>
        </TouchableOpacity>
        {expanded === item.id ? <View style={styles.details}>
          <Text style={styles.info}>{item.address ? item.address + ", " : ""}{item.city}, {item.state} {item.zipCode}</Text>
          <Text style={styles.info}>Client rate: ${item.billingRate.toFixed(2)}/hr · Caregiver rate: ${item.caregiverRate.toFixed(2)}/hr</Text>
          {item.contactName ? <Text style={styles.info}>Contact: {item.contactName}{item.contactPhone ? " · " + item.contactPhone : ""}</Text> : null}
          {item.notes ? <Text style={styles.info}>Notes: {item.notes}</Text> : null}
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: "/client-schedule", params: { clientId: String(item.id) } })} style={styles.secondary}>
            <Text style={{ color: colors.green, fontWeight: "900" }}>Create care schedule →</Text>
          </TouchableOpacity>
        </View> : null}
      </View>)}
    </ScrollView>
    <EmployerTabBar />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 40 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  sub: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 5 },
  add: { flexDirection: "row", backgroundColor: colors.green, borderRadius: 14, alignItems: "center", padding: 12, gap: 5 },
  addText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  form: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 19, padding: 17, marginBottom: 20 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: "#FFFFFF", color: colors.ink, minHeight: 46, paddingHorizontal: 12, fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 10 },
  primary: { backgroundColor: colors.green, borderRadius: 14, minHeight: 50, marginTop: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  secondary: { backgroundColor: colors.greenSoft, borderRadius: 12, padding: 13, alignItems: "center", marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  count: { fontSize: 12, fontWeight: "800", color: colors.muted },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: "900", marginBottom: 6 },
  info: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 8 },
  error: { backgroundColor: "#FFF2EE", padding: 12, borderRadius: 12, marginBottom: 12 },
  empty: { backgroundColor: "#FFFFFF", padding: 25, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  client: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 10 },
  avatar: { borderRadius: 15, backgroundColor: colors.greenSoft, width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  clientName: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  details: { borderTopWidth: 1, borderColor: colors.border, marginTop: 13, paddingTop: 7 },
});
