import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedShiftId?: number;
}

export default function NotificationsScreen() {
  const [selectedNotification, setSelectedNotification] = useState<number | null>(null);

  const { data: notifications = [], isLoading, refetch } = trpc.notifications.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleMarkAsRead = async (notificationId: number) => {
    await markAsReadMutation.mutateAsync({ id: notificationId });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "shift_match":
        return "🎯";
      case "shift_offer":
        return "📋";
      case "shift_accepted":
        return "✅";
      case "shift_completed":
        return "🏁";
      case "rating_received":
        return "⭐";
      case "payment_processed":
        return "💰";
      default:
        return "🔔";
    }
  };

  const renderNotificationCard = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedNotification(item.id);
        if (!item.read) {
          handleMarkAsRead(item.id);
        }
      }}
      className={cn(
        "p-4 mb-2 rounded-lg border",
        item.read
          ? "bg-background border-border"
          : "bg-primary/5 border-primary/20"
      )}
    >
      <View className="flex-row items-start gap-3">
        <Text className="text-2xl">{getNotificationIcon(item.type)}</Text>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text
              className={cn(
                "font-semibold flex-1",
                item.read ? "text-muted" : "text-foreground"
              )}
            >
              {item.title}
            </Text>
            {!item.read && (
              <View className="w-2 h-2 bg-primary rounded-full ml-2 mt-1" />
            )}
          </View>
          <Text className="text-sm text-muted mt-1 leading-relaxed">
            {item.message}
          </Text>
          <Text className="text-xs text-muted mt-2">
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ScreenContainer>
    );
  }

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <ScreenContainer className="flex-1">
      <View className="mb-4">
        <Text className="text-3xl font-bold text-foreground">Notifications</Text>
        {unreadCount > 0 && (
          <Text className="text-muted mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-2xl mb-2">🔔</Text>
          <Text className="text-muted text-center">
            No notifications yet. You'll see updates about shifts, offers, and more here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationCard}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      )}
    </ScreenContainer>
  );
}
