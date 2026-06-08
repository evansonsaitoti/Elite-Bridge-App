import { View, Text, ScrollView, TouchableOpacity, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Admin Notifications Screen - Real-time platform events and alerts
 */
export default function AdminNotificationsScreen() {
  const colors = useColors();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "application",
      title: "New Application",
      message: "Sarah Johnson applied for Caregiver position at Sunrise Senior Living",
      timestamp: "2 minutes ago",
      read: false,
      icon: "📋",
    },
    {
      id: 2,
      type: "backgroundCheck",
      title: "Background Check Complete",
      message: "Michael Chen's background check came back CLEAR",
      timestamp: "15 minutes ago",
      read: false,
      icon: "✓",
    },
    {
      id: 3,
      type: "shift",
      title: "Shift Filled",
      message: "Activities Coordinator shift at Golden Years has been filled",
      timestamp: "1 hour ago",
      read: true,
      icon: "✓",
    },
    {
      id: 4,
      type: "application",
      title: "Application Rejected",
      message: "Emily Rodriguez's application for Dining Services was rejected",
      timestamp: "3 hours ago",
      read: true,
      icon: "✗",
    },
    {
      id: 5,
      type: "backgroundCheck",
      title: "Background Check Pending",
      message: "James Wilson's background check is pending review",
      timestamp: "5 hours ago",
      read: true,
      icon: "⏳",
    },
    {
      id: 6,
      type: "shift",
      title: "New Shift Posted",
      message: "You posted a new Caregiver - Memory Care shift",
      timestamp: "1 day ago",
      read: true,
      icon: "📌",
    },
  ]);

  const handleMarkAsRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const handleDeleteNotification = (notificationId: number) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    Alert.alert("Success", "All notifications marked as read");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const styles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      gap: 12,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 8,
    },
    headerRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold" as const,
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
    },
    unreadBadge: {
      backgroundColor: colors.error,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignItems: "center" as const,
    },
    unreadBadgeText: {
      fontSize: 12,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    markAllButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center" as const,
      marginBottom: 8,
    },
    markAllButtonText: {
      fontSize: 13,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    notificationCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      marginBottom: 10,
      gap: 8,
    },
    notificationCardUnread: {
      borderColor: colors.primary,
      backgroundColor: "rgba(27, 94, 63, 0.05)",
    },
    notificationCardRead: {
      borderColor: colors.border,
    },
    notificationHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
    },
    notificationContent: {
      flex: 1,
      flexDirection: "row" as const,
      gap: 10,
    },
    notificationIcon: {
      fontSize: 24,
      width: 32,
      height: 32,
      textAlignVertical: "center" as const,
      textAlign: "center" as const,
    },
    notificationInfo: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 2,
    },
    notificationMessage: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
    notificationTimestamp: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 6,
    },
    notificationActions: {
      flexDirection: "row" as const,
      gap: 8,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    markReadButton: {
      backgroundColor: colors.primary,
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
    actionButtonText: {
      fontSize: 11,
      fontWeight: "bold" as const,
      color: colors.background,
    },
    emptyState: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 60,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "bold" as const,
      color: colors.foreground,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.muted,
    },
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>Stay updated on platform activity</Text>
        </View>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllButtonText}>Mark All as Read</Text>
          </TouchableOpacity>
        )}

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.notificationCard,
                  item.read ? styles.notificationCardRead : styles.notificationCardUnread,
                ]}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationIcon}>{item.icon}</Text>
                    <View style={styles.notificationInfo}>
                      <Text style={styles.notificationTitle}>{item.title}</Text>
                      <Text style={styles.notificationMessage}>{item.message}</Text>
                      <Text style={styles.notificationTimestamp}>{item.timestamp}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.notificationActions}>
                  {!item.read && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.markReadButton]}
                      onPress={() => handleMarkAsRead(item.id)}
                    >
                      <Text style={styles.actionButtonText}>Mark as Read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteNotification(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No Notifications</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
