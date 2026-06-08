import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Messaging System - Chat interface between staff and admins
 */
export default function MessagesScreen() {
  const colors = useColors();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const styles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      gap: 16,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    chatListContainer: {
      gap: 12,
    },
    chatItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    chatItemActive: {
      borderColor: colors.primary,
      backgroundColor: "rgba(27, 94, 63, 0.05)",
    },
    chatInfo: {
      flex: 1,
    },
    chatName: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.foreground,
    },
    chatPreview: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
    },
    chatTime: {
      fontSize: 11,
      color: colors.muted,
    },
    unreadBadge: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginLeft: 8,
    },
    unreadText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    chatDetailContainer: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden" as const,
    },
    chatDetailHeader: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    chatDetailTitle: {
      fontSize: 16,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    chatDetailClose: {
      fontSize: 20,
      color: colors.background,
    },
    messagesContainer: {
      flex: 1,
      padding: 12,
      gap: 12,
    },
    messageRow: {
      flexDirection: "row" as const,
      marginBottom: 12,
    },
    messageBubble: (isOwn: boolean) => ({
      backgroundColor: isOwn ? colors.primary : colors.border,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignSelf: isOwn ? "flex-end" as const : "flex-start" as const,
    } as any),
    messageText: (isOwn: boolean) => ({
      fontSize: 13,
      color: isOwn ? colors.background : colors.foreground,
    }),
    messageTime: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 4,
      textAlign: "right" as const,
    },
    inputContainer: {
      flexDirection: "row" as const,
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
      fontSize: 13,
      color: colors.foreground,
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    sendButtonText: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    emptyState: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: "center" as const,
    },
  };

  const chatThreads = [
    {
      id: "1",
      name: "Sarah Johnson (Admin)",
      role: "Shift Administrator",
      lastMessage: "Great! You're confirmed for tomorrow's shift.",
      time: "2 min ago",
      unread: 1,
      messages: [
        { id: "1", text: "Hi, I'm interested in the Caregiver shift tomorrow", isOwn: true, time: "10:30 AM" },
        { id: "2", text: "Great! You're confirmed for tomorrow's shift.", isOwn: false, time: "10:32 AM" },
        { id: "3", text: "Thank you! What time should I arrive?", isOwn: true, time: "10:33 AM" },
        { id: "4", text: "Please arrive 15 minutes early at 7:45 AM", isOwn: false, time: "10:35 AM" },
      ],
    },
    {
      id: "2",
      name: "Michael Chen (Admin)",
      role: "Facility Manager",
      lastMessage: "Your background check has been cleared",
      time: "1 hour ago",
      unread: 0,
      messages: [
        { id: "1", text: "When will I know about my background check?", isOwn: true, time: "9:00 AM" },
        { id: "2", text: "Your background check has been cleared", isOwn: false, time: "9:15 AM" },
        { id: "3", text: "Excellent! Thank you for letting me know", isOwn: true, time: "9:16 AM" },
      ],
    },
    {
      id: "3",
      name: "Emily Rodriguez (Admin)",
      role: "HR Coordinator",
      lastMessage: "Welcome to the team!",
      time: "3 hours ago",
      unread: 0,
      messages: [
        { id: "1", text: "I just completed my profile", isOwn: true, time: "7:30 AM" },
        { id: "2", text: "Welcome to the team!", isOwn: false, time: "7:45 AM" },
      ],
    },
  ];

  const selectedThread = chatThreads.find((t) => t.id === selectedChat);

  return (
    <ScreenContainer>
      {!selectedChat ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} scrollEnabled={true}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>Chat with admins and facilities</Text>
          </View>

          {/* Chat List */}
          <View style={styles.chatListContainer}>
            {chatThreads.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={[styles.chatItem, selectedChat === chat.id && styles.chatItemActive]}
                onPress={() => setSelectedChat(chat.id)}
              >
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {chat.lastMessage}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" as const }}>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                  {chat.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unread}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : selectedThread ? (
        <View style={styles.chatDetailContainer}>
          {/* Chat Header */}
          <View style={styles.chatDetailHeader}>
            <View>
              <Text style={styles.chatDetailTitle}>{selectedThread.name}</Text>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{selectedThread.role}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedChat(null)}>
              <Text style={styles.chatDetailClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView style={styles.messagesContainer}>
            {selectedThread.messages.map((msg) => (
              <View key={msg.id} style={styles.messageRow}>
                <View style={styles.messageBubble(msg.isOwn)}>
                  <Text style={styles.messageText(msg.isOwn)}>{msg.text}</Text>
                  <Text style={styles.messageTime}>{msg.time}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.muted}
              value={messageText}
              onChangeText={setMessageText}
            />
            <TouchableOpacity style={styles.sendButton} onPress={() => setMessageText("")}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
