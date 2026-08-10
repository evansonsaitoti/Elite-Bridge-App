import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

type ChatMessage = {
  id: number;
  from: "agency" | "caregiver";
  body: string;
  time: string;
};

const quickReplies = ["Running late", "Need directions", "Client update", "Clock issue"];

export default function StaffChat() {
  const colors = useColors();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "agency",
      body: "Elite Bridge support is here for shift questions, urgent updates, clock issues and agency messages.",
      time: "Now",
    },
    {
      id: 2,
      from: "agency",
      body: "If this is an emergency, call 911 first, then update your agency through this chat.",
      time: "Now",
    },
  ]);

  const canSend = draft.trim().length > 0;
  const statusText = useMemo(() => `${messages.length} messages · Agency support channel`, [messages.length]);

  const sendMessage = (body: string) => {
    const clean = body.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), from: "caregiver", body: clean, time: "Now" },
      {
        id: Date.now() + 1,
        from: "agency",
        body: "Received. Your agency team will see this update in Elite Bridge Employer.",
        time: "Now",
      },
    ]);
    setDraft("");
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: 18, paddingBottom: 128 }}
        >
          <Text style={{ color: "#C58A24", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 }}>
            ELITE BRIDGE CAREGIVER
          </Text>
          <Text style={{ fontSize: 30, fontWeight: "900", color: colors.foreground, marginTop: 5 }}>Chat</Text>
          <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: 18 }}>
            Message your agency about shifts, clock issues and care updates.
          </Text>

          <View style={{ backgroundColor: "#0A4A35", borderRadius: 22, padding: 18, marginBottom: 14 }}>
            <Text style={{ color: "#EBCB8B", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }}>SECURE CARE CHANNEL</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900", lineHeight: 26, marginTop: 8 }}>
              Keep the agency informed before small issues become missed visits.
            </Text>
            <Text style={{ color: "#D9E9E2", fontSize: 12, lineHeight: 18, marginTop: 8 }}>{statusText}</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {quickReplies.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => sendMessage(item)}
                style={{ borderRadius: 999, backgroundColor: "#EAF4EF", paddingHorizontal: 12, paddingVertical: 9 }}
              >
                <Text style={{ color: "#0A4A35", fontSize: 12, fontWeight: "900" }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ gap: 10 }}>
            {messages.map((message) => {
              const mine = message.from === "caregiver";
              return (
                <View
                  key={message.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "86%",
                    backgroundColor: mine ? "#0A4A35" : colors.surface,
                    borderWidth: mine ? 0 : 1,
                    borderColor: colors.border,
                    borderRadius: 18,
                    padding: 13,
                  }}
                >
                  <Text style={{ color: mine ? "#FFFFFF" : colors.foreground, fontSize: 13, lineHeight: 19, fontWeight: "700" }}>
                    {message.body}
                  </Text>
                  <Text style={{ color: mine ? "#BFE4D4" : colors.muted, fontSize: 10, marginTop: 6, fontWeight: "800" }}>{message.time}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ marginTop: 18, backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.border }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message to the agency..."
              placeholderTextColor="#98A2B3"
              multiline
              style={{ minHeight: 64, color: colors.foreground, fontSize: 14, lineHeight: 20 }}
            />
            <TouchableOpacity
              disabled={!canSend}
              onPress={() => sendMessage(draft)}
              style={{ alignSelf: "flex-end", backgroundColor: canSend ? "#0A4A35" : "#D0D5DD", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13 }}>Send</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
