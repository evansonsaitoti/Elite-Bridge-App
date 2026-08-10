import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Message = {
  id: number;
  from: "agency" | "caregiver";
  sender: string;
  body: string;
  time: string;
};

const quickActions = ["Broadcast open shift", "Ask for ETA", "Send clock reminder", "Check client update"];

export default function EmployerChat() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: "caregiver",
      sender: "Caregiver channel",
      body: "Chat centralizes caregiver updates, shift questions, clock issues and agency broadcasts.",
      time: "Now",
    },
    {
      id: 2,
      from: "agency",
      sender: "Elite Bridge Employer",
      body: "Use quick actions to send structured messages caregivers can respond to from their app.",
      time: "Now",
    },
  ]);

  const canSend = draft.trim().length > 0;
  const openThreads = useMemo(() => messages.filter((message) => message.from === "caregiver").length, [messages]);

  const sendMessage = (body: string) => {
    const clean = body.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), from: "agency", sender: "Agency", body: clean, time: "Now" },
      {
        id: Date.now() + 1,
        from: "caregiver",
        sender: "Caregiver app",
        body: "Received. Caregiver responses will appear here for scheduler follow-up.",
        time: "Now",
      },
    ]);
    setDraft("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.brand}>ELITE BRIDGE</Text>
              <Text style={styles.brandSub}>EMPLOYER CHAT</Text>
            </View>
            <View style={styles.badge}><Text style={styles.badgeText}>{openThreads}</Text></View>
          </View>

          <Text style={styles.heading}>Agency Chat</Text>
          <Text style={styles.subheading}>Coordinate caregivers, urgent coverage and clock issues from one secure channel.</Text>

          <View style={styles.commandCard}>
            <Text style={styles.commandEyebrow}>CARE TEAM COMMAND</Text>
            <Text style={styles.commandTitle}>Send the right message before coverage breaks.</Text>
            <Text style={styles.commandBody}>Use this for shift broadcasts, ETA checks, reminders and caregiver support.</Text>
          </View>

          <View style={styles.quickRow}>
            {quickActions.map((item) => (
              <TouchableOpacity key={item} style={styles.quickChip} onPress={() => sendMessage(item)}>
                <Text style={styles.quickChipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.thread}>
            {messages.map((message) => {
              const agency = message.from === "agency";
              return (
                <View key={message.id} style={[styles.bubble, agency ? styles.agencyBubble : styles.caregiverBubble]}>
                  <Text style={[styles.sender, agency ? styles.agencySender : styles.caregiverSender]}>{message.sender}</Text>
                  <Text style={[styles.message, agency ? styles.agencyMessage : styles.caregiverMessage]}>{message.body}</Text>
                  <Text style={[styles.time, agency ? styles.agencyTime : styles.caregiverTime]}>{message.time}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message or broadcast..."
              placeholderTextColor="#98A2B3"
              multiline
              style={styles.input}
            />
            <TouchableOpacity disabled={!canSend} onPress={() => sendMessage(draft)} style={[styles.send, !canSend && styles.sendDisabled]}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F9F8" },
  content: { padding: 20, paddingBottom: 128 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  brand: { color: "#0A4A35", fontSize: 16, fontWeight: "900", letterSpacing: 1.4 },
  brandSub: { marginTop: 2, color: "#C58A24", fontSize: 11, fontWeight: "900", letterSpacing: 2.2 },
  badge: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EAF4EF", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#0A4A35", fontSize: 16, fontWeight: "900" },
  heading: { color: "#101828", fontSize: 32, fontWeight: "900", letterSpacing: -0.7 },
  subheading: { color: "#667085", fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 18 },
  commandCard: { backgroundColor: "#0A4A35", borderRadius: 22, padding: 18, marginBottom: 14 },
  commandEyebrow: { color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  commandTitle: { color: "#FFFFFF", fontSize: 22, lineHeight: 28, fontWeight: "900", marginTop: 7 },
  commandBody: { color: "#D9E9E2", fontSize: 12, lineHeight: 18, marginTop: 8 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  quickChip: { backgroundColor: "#EAF4EF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  quickChipText: { color: "#0A4A35", fontSize: 12, fontWeight: "900" },
  thread: { gap: 10 },
  bubble: { maxWidth: "88%", borderRadius: 18, padding: 13 },
  agencyBubble: { alignSelf: "flex-end", backgroundColor: "#0A4A35" },
  caregiverBubble: { alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E7EC" },
  sender: { fontSize: 10, fontWeight: "900", marginBottom: 5 },
  agencySender: { color: "#BFE4D4" },
  caregiverSender: { color: "#667085" },
  message: { fontSize: 13, lineHeight: 19, fontWeight: "700" },
  agencyMessage: { color: "#FFFFFF" },
  caregiverMessage: { color: "#101828" },
  time: { fontSize: 10, marginTop: 6, fontWeight: "800" },
  agencyTime: { color: "#BFE4D4" },
  caregiverTime: { color: "#98A2B3" },
  composer: { marginTop: 18, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "#E4E7EC" },
  input: { minHeight: 64, color: "#101828", fontSize: 14, lineHeight: 20 },
  send: { alignSelf: "flex-end", backgroundColor: "#0A4A35", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 },
  sendDisabled: { backgroundColor: "#D0D5DD" },
  sendText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
});
