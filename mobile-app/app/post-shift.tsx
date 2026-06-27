import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { colors } from "../src/theme";

export default function PostShiftScreen() {
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState("Companion Care");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [hourlyRate, setHourlyRate] = useState("35");
  const [duties, setDuties] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title || !date || !startTime || !endTime || !address || !city || !zipCode || !duties || !contactName || !contactPhone) {
      Alert.alert("Missing info", "Please complete all required fields.");
      return;
    }

    setLoading(true);
    try {
      await api.createShift({
        title,
        serviceType,
        caregiverType: "Companion",
        scheduleType: "one_time",
        startDate: date,
        endDate: date,
        startTime,
        endTime,
        location: { type: "client_home", address, city, state: "MA", zipCode },
        pay: { hourlyRate: Number(hourlyRate), currency: "USD" },
        numberOfCaregivers: 1,
        requirements: [],
        responsibilities: duties,
        contact: { name: contactName, phone: contactPhone },
        urgency: "standard",
        status: "open",
      });
      Alert.alert("Success", "Shift posted successfully.");
      router.replace("/dashboard");
    } catch (error: any) {
      Alert.alert("Could not post shift", error.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
          <Text style={styles.heading}>Post a Shift</Text>
        </View>

        <TextInput style={styles.input} placeholder="Shift title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Service type" value={serviceType} onChangeText={setServiceType} />
        <TextInput style={styles.input} placeholder="Date YYYY-MM-DD" value={date} onChangeText={setDate} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="Start HH:MM" value={startTime} onChangeText={setStartTime} />
          <TextInput style={[styles.input, styles.half]} placeholder="End HH:MM" value={endTime} onChangeText={setEndTime} />
        </View>
        <TextInput style={styles.input} placeholder="Street address" value={address} onChangeText={setAddress} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="City" value={city} onChangeText={setCity} />
          <TextInput style={[styles.input, styles.half]} placeholder="Zip" value={zipCode} onChangeText={setZipCode} />
        </View>
        <TextInput style={styles.input} placeholder="Hourly rate" keyboardType="numeric" value={hourlyRate} onChangeText={setHourlyRate} />
        <TextInput style={[styles.input, styles.textArea]} placeholder="Main duties" multiline value={duties} onChangeText={setDuties} />
        <TextInput style={styles.input} placeholder="Contact name" value={contactName} onChangeText={setContactName} />
        <TextInput style={styles.input} placeholder="Contact phone" keyboardType="phone-pad" value={contactPhone} onChangeText={setContactPhone} />

        <Pressable style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Post Shift</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  back: { color: colors.gold, fontWeight: "800" },
  heading: { fontSize: 26, fontWeight: "800", color: colors.green },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 16 },
  textArea: { height: 110, textAlignVertical: "top" },
  button: { backgroundColor: colors.gold, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
