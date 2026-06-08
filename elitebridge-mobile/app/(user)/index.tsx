import { ScrollView, Text, View, FlatList, StyleSheet, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

/**
 * User Home Screen - Browse available shifts
 * Phase 2: Enhanced styling with proper card layout
 */
export default function UserHomeScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleViewDetails = (shiftId: number) => {
    router.push(`/(user)/shift/${shiftId}`);
  };

  const mockShifts = [
    {
      id: 1,
      title: "Caregiver - Assisted Living",
      location: "Sunrise Senior Living - Maple Grove",
      date: "Tomorrow",
      time: "8:00 AM - 4:00 PM",
      pay: "$18/hr",
    },
    {
      id: 2,
      title: "Activities Coordinator",
      location: "Golden Years Community Center",
      date: "Tomorrow",
      time: "10:00 AM - 6:00 PM",
      pay: "$16/hr",
    },
    {
      id: 3,
      title: "Dining Services Assistant",
      location: "Meadowbrook Assisted Living",
      date: "Day After Tomorrow",
      time: "9:00 AM - 5:00 PM",
      pay: "$17/hr",
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 16,
    },
    header: {
      gap: 8,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    shiftCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    cardLeft: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.foreground,
    },
    cardLocation: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
    },
    payBadge: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    payText: {
      fontSize: 13,
      fontWeight: "bold",
      color: colors.background,
    },
    cardDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardTime: {
      fontSize: 12,
      color: colors.muted,
    },
    viewDetailsText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
    },
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Available Shifts</Text>
            <Text style={styles.headerSubtitle}>Find and apply for shifts near you</Text>
          </View>

          {/* Shifts List */}
          <FlatList
            data={mockShifts}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable style={styles.shiftCard} onPress={() => handleViewDetails(item.id)}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardLocation}>{item.location}</Text>
                  </View>
                  <View style={styles.payBadge}>
                    <Text style={styles.payText}>{item.pay}</Text>
                  </View>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardBottom}>
                  <Text style={styles.cardTime}>
                    {item.date} • {item.time}
                  </Text>
                  <Text style={styles.viewDetailsText}>View Details →</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
