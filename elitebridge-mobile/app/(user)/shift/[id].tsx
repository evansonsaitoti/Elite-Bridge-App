import { ScrollView, Text, View, StyleSheet, Pressable, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

/**
 * Shift Detail Screen - View full shift information and apply
 * Focused on assisted living and non-medical senior care facilities
 */
export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useColors();

  // Mock shift data - Assisted Living and Senior Care focused
  const shiftDetails: Record<string, any> = {
    "1": {
      id: 1,
      title: "Caregiver - Assisted Living",
      location: "Sunrise Senior Living - Maple Grove",
      date: "Tomorrow",
      time: "8:00 AM - 4:00 PM",
      pay: "$18/hr",
      totalPay: "$144",
      description:
        "Join our compassionate team at Sunrise Senior Living! We're seeking a caring caregiver to provide support to our residents in daily activities, companionship, and personal care assistance. This is a rewarding opportunity to make a meaningful difference in seniors' lives.",
      requirements: [
        "High school diploma or equivalent",
        "Ability to lift up to 50 lbs with proper assistance",
        "Excellent communication and listening skills",
        "Compassion and patience with seniors",
        "Reliable transportation and valid driver's license",
        "Willingness to undergo background check",
      ],
      responsibilities: [
        "Assist residents with activities of daily living (ADL)",
        "Provide companionship and emotional support",
        "Help with mobility and transferring",
        "Maintain clean and safe living spaces",
        "Report any concerns to management",
        "Participate in recreational activities with residents",
      ],
      employer: "Sunrise Senior Living",
      employerRating: 4.7,
      applicants: 12,
    },
    "2": {
      id: 2,
      title: "Activities Coordinator",
      location: "Golden Years Community Center",
      date: "Tomorrow",
      time: "10:00 AM - 6:00 PM",
      pay: "$16/hr",
      totalPay: "$128",
      description:
        "Help enrich the lives of our senior residents by planning and leading engaging activities and programs. From arts and crafts to fitness classes and social events, you'll create memorable experiences for our community.",
      requirements: [
        "Experience working with seniors or community groups",
        "Creative and organized mindset",
        "Excellent interpersonal skills",
        "Ability to manage multiple activities",
        "Physical ability to stand and move around",
      ],
      responsibilities: [
        "Plan and organize daily activities and programs",
        "Lead fitness, arts, and recreational classes",
        "Coordinate special events and celebrations",
        "Encourage resident participation",
        "Document attendance and feedback",
        "Maintain activity spaces and supplies",
      ],
      employer: "Golden Years Community Center",
      employerRating: 4.5,
      applicants: 8,
    },
    "3": {
      id: 3,
      title: "Dining Services Assistant",
      location: "Meadowbrook Assisted Living",
      date: "Day After Tomorrow",
      time: "9:00 AM - 5:00 PM",
      pay: "$17/hr",
      totalPay: "$136",
      description:
        "Support our dining services team in providing nutritious meals and a pleasant dining experience for our residents. Help with meal preparation, service, and cleanup in a friendly and efficient manner.",
      requirements: [
        "Food service or hospitality experience preferred",
        "Ability to follow food safety guidelines",
        "Physical ability to lift and carry items",
        "Friendly and service-oriented attitude",
        "Attention to detail and cleanliness",
      ],
      responsibilities: [
        "Assist with meal preparation and plating",
        "Serve meals and beverages to residents",
        "Clear tables and maintain dining areas",
        "Follow food safety and sanitation standards",
        "Accommodate dietary restrictions and preferences",
        "Support special dining events",
      ],
      employer: "Meadowbrook Assisted Living",
      employerRating: 4.6,
      applicants: 15,
    },
  };

  const shift = shiftDetails[id as string] || shiftDetails["1"];

  const handleApply = () => {
    Alert.alert("Application Submitted", `You've successfully applied for the ${shift.title} position!`, [
      {
        text: "View Applications",
        onPress: () => router.push("/(user)/applications"),
      },
      {
        text: "Continue Browsing",
        onPress: () => router.back(),
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      gap: 0,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.background,
    },
    headerLocation: {
      fontSize: 16,
      color: colors.background,
      opacity: 0.9,
    },
    headerMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    headerMetaItem: {
      gap: 4,
    },
    headerMetaLabel: {
      fontSize: 12,
      color: colors.background,
      opacity: 0.8,
    },
    headerMetaValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
      gap: 24,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.foreground,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.muted,
      lineHeight: 22,
    },
    listItem: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 8,
    },
    listBullet: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "bold",
      width: 20,
    },
    listText: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    employerCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    employerName: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.foreground,
    },
    employerInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ratingText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
    },
    applicantsText: {
      fontSize: 12,
      color: colors.muted,
    },
    applyButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 16,
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.background,
    },
    backButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 8,
    },
    backButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
    },
  });

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{shift.title}</Text>
          <Text style={styles.headerLocation}>{shift.location}</Text>
          <View style={styles.headerMeta}>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>Date</Text>
              <Text style={styles.headerMetaValue}>{shift.date}</Text>
            </View>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>Time</Text>
              <Text style={styles.headerMetaValue}>{shift.time}</Text>
            </View>
            <View style={styles.headerMetaItem}>
              <Text style={styles.headerMetaLabel}>Pay</Text>
              <Text style={styles.headerMetaValue}>{shift.pay}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.content}>
          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Shift</Text>
            <Text style={styles.sectionDescription}>{shift.description}</Text>
          </View>

          {/* Estimated Earnings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimated Earnings</Text>
            <View style={styles.employerCard}>
              <Text style={styles.sectionDescription}>
                Based on {shift.time} ({shift.pay})
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>
                {shift.totalPay}
              </Text>
            </View>
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {shift.requirements.map((req: string, idx: number) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText}>{req}</Text>
              </View>
            ))}
          </View>

          {/* Responsibilities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Responsibilities</Text>
            {shift.responsibilities.map((resp: string, idx: number) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText}>{resp}</Text>
              </View>
            ))}
          </View>

          {/* Employer Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Facility</Text>
            <View style={styles.employerCard}>
              <Text style={styles.employerName}>{shift.employer}</Text>
              <View style={styles.employerInfo}>
                <Text style={styles.ratingText}>⭐ {shift.employerRating} Rating</Text>
                <Text style={styles.applicantsText}>{shift.applicants} applicants</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Apply Button */}
      <Pressable style={styles.applyButton} onPress={handleApply}>
        <Text style={styles.applyButtonText}>Apply Now</Text>
      </Pressable>
    </ScreenContainer>
  );
}
