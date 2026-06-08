import { ScrollView, Text, View, TouchableOpacity, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

/**
 * Rating and Review System - Staff and facility reviews
 */
export default function ReviewsScreen() {
  const colors = useColors();
  const [selectedTab, setSelectedTab] = useState<"given" | "received">("received");
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

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
    tabContainer: {
      flexDirection: "row" as const,
      gap: 8,
      marginBottom: 16,
    },
    tabButton: (active: boolean) => ({
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: active ? colors.primary : colors.surface,
      borderWidth: 1,
      borderColor: active ? colors.primary : colors.border,
      alignItems: "center" as const,
    }),
    tabButtonText: (active: boolean) => ({
      fontSize: 12,
      fontWeight: "bold" as const,
      color: active ? colors.background : colors.foreground,
    }),
    ratingCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    ratingHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginBottom: 10,
    },
    ratingTitle: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.foreground,
    },
    ratingDate: {
      fontSize: 11,
      color: colors.muted,
    },
    ratingStars: {
      fontSize: 16,
      marginBottom: 8,
    },
    ratingText: {
      fontSize: 12,
      color: colors.foreground,
      lineHeight: 18,
      marginBottom: 10,
    },
    ratingMeta: {
      fontSize: 11,
      color: colors.muted,
      fontStyle: "italic" as const,
    },
    sectionContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden" as const,
      marginBottom: 12,
    },
    sectionHeader: (bgColor: string) => ({
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: bgColor,
    }),
    sectionTitle: {
      fontSize: 15,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
    },
    sectionIcon: {
      fontSize: 20,
      color: "#FFFFFF",
    },
    sectionContent: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      backgroundColor: colors.surface,
    },
    statsRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: "rgba(0,0,0,0.02)",
      borderRadius: 8,
      marginBottom: 8,
    },
    statsLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    statsValue: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.primary,
    },
    ratingBar: {
      marginBottom: 10,
    },
    ratingBarLabel: {
      fontSize: 11,
      color: colors.muted,
      marginBottom: 4,
    },
    ratingBarContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    ratingBarFill: (percentage: number) => ({
      height: 8,
      backgroundColor: colors.primary,
      borderRadius: 4,
      flex: 1,
      width: `${percentage}%`,
    } as any),
    ratingBarMax: {
      fontSize: 11,
      color: colors.muted,
      minWidth: 30,
      textAlign: "right" as const,
    },
    emptyState: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 32,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: "center" as const,
    },
    writeReviewButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center" as const,
      marginTop: 12,
    },
    writeReviewButtonText: {
      fontSize: 14,
      fontWeight: "bold" as const,
      color: colors.background,
    },
  };

  const receivedReviews = [
    {
      id: "1",
      from: "Sunrise Senior Living",
      rating: 5,
      date: "May 20, 2026",
      text: "Excellent caregiver! Very attentive to residents' needs and great communication.",
      category: "Facility Review",
    },
    {
      id: "2",
      from: "Golden Years Community",
      rating: 4.5,
      date: "May 18, 2026",
      text: "Great work during the activities coordinator shift. Residents loved the engagement.",
      category: "Facility Review",
    },
    {
      id: "3",
      from: "Meadowbrook Assisted Living",
      rating: 5,
      date: "May 15, 2026",
      text: "Professional, reliable, and compassionate. Would love to have you back!",
      category: "Facility Review",
    },
  ];

  const givenReviews = [
    {
      id: "1",
      about: "Sunrise Senior Living",
      rating: 4.5,
      date: "May 20, 2026",
      text: "Clean facility with caring staff. Great experience overall.",
      category: "Facility Review",
    },
    {
      id: "2",
      about: "Golden Years Community",
      rating: 5,
      date: "May 18, 2026",
      text: "Wonderful environment and supportive management. Highly recommend!",
      category: "Facility Review",
    },
  ];

  const ratingStats = {
    average: 4.7,
    total: 12,
    distribution: {
      5: 10,
      4: 2,
      3: 0,
      2: 0,
      1: 0,
    },
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    let stars = "★".repeat(fullStars);
    if (hasHalf) stars += "½";
    stars += "☆".repeat(5 - Math.ceil(rating));
    return stars;
  };

  const reviews = selectedTab === "received" ? receivedReviews : givenReviews;

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} scrollEnabled={true}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reviews & Ratings</Text>
          <Text style={styles.headerSubtitle}>Build your reputation on the platform</Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tabButton(selectedTab === "received")}
            onPress={() => setSelectedTab("received")}
          >
            <Text style={styles.tabButtonText(selectedTab === "received")}>Received ({receivedReviews.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton(selectedTab === "given")}
            onPress={() => setSelectedTab("given")}
          >
            <Text style={styles.tabButtonText(selectedTab === "given")}>Given ({givenReviews.length})</Text>
          </TouchableOpacity>
        </View>

        {selectedTab === "received" && (
          <>
            {/* Rating Summary */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader("#45B7D1")}>
                <Text style={styles.sectionTitle}>⭐ Your Rating Summary</Text>
                <Text style={styles.sectionIcon}>▼</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.statsRow}>
                  <Text style={styles.statsLabel}>Average Rating</Text>
                  <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 8 }}>
                    <Text style={styles.statsValue}>{ratingStats.average}</Text>
                    <Text style={{ fontSize: 14, color: colors.primary }}>★</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statsLabel}>Total Reviews</Text>
                  <Text style={styles.statsValue}>{ratingStats.total}</Text>
                </View>

                {/* Rating Distribution */}
                <View style={{ marginTop: 12 }}>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <View key={rating} style={styles.ratingBar}>
                      <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 8 }}>
                        <Text style={styles.ratingBarLabel}>{rating}★</Text>
                        <View style={styles.ratingBarContainer}>
                          <View
                            style={styles.ratingBarFill(
                              (ratingStats.distribution[rating as keyof typeof ratingStats.distribution] / ratingStats.total) * 100
                            )}
                          />
                        </View>
                        <Text style={styles.ratingBarMax}>
                          {ratingStats.distribution[rating as keyof typeof ratingStats.distribution]}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Reviews List */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader("#BB8FCE")}>
            <Text style={styles.sectionTitle}>💬 {selectedTab === "received" ? "Received" : "Given"} Reviews</Text>
            <Text style={styles.sectionIcon}>▼</Text>
          </View>
          <View style={styles.sectionContent}>
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <TouchableOpacity
                  key={review.id}
                  style={styles.ratingCard}
                  onPress={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                >
                  <View style={styles.ratingHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ratingTitle}>
                        {selectedTab === "received" ? (review as any).from : (review as any).about}
                      </Text>
                      <Text style={styles.ratingDate}>{review.date}</Text>
                    </View>
                    <Text style={styles.ratingStars}>{renderStars(review.rating)}</Text>
                  </View>
                  {expandedReview === review.id && (
                    <>
                      <Text style={styles.ratingText}>{review.text}</Text>
                      <Text style={styles.ratingMeta}>{review.category}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No reviews yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Write Review Button */}
        {selectedTab === "given" && (
          <TouchableOpacity style={styles.writeReviewButton} onPress={() => {}}>
            <Text style={styles.writeReviewButtonText}>✍️ Write a Review</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
