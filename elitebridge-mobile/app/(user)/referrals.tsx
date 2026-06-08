import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

export default function ReferralsScreen() {
  const [referralCode] = useState("SARAH2024");
  const [showShareModal, setShowShareModal] = useState(false);

  const referralStats = {
    totalReferrals: 8,
    successfulReferrals: 5,
    totalEarned: 250,
    pendingEarnings: 75,
  };

  const referrals = [
    {
      id: "1",
      name: "Jessica Martinez",
      status: "Completed",
      earnedDate: "May 15, 2026",
      reward: "$50",
      statusColor: "#4CAF50",
    },
    {
      id: "2",
      name: "Michael Chen",
      status: "Completed",
      earnedDate: "May 10, 2026",
      reward: "$50",
      statusColor: "#4CAF50",
    },
    {
      id: "3",
      name: "David Lee",
      status: "Pending",
      earnedDate: "May 20, 2026",
      reward: "$50",
      statusColor: "#FF9800",
    },
    {
      id: "4",
      name: "Emily Rodriguez",
      status: "Pending",
      earnedDate: "May 22, 2026",
      reward: "$25",
      statusColor: "#FF9800",
    },
    {
      id: "5",
      name: "James Wilson",
      status: "Completed",
      earnedDate: "May 5, 2026",
      reward: "$50",
      statusColor: "#4CAF50",
    },
  ];

  const handleShare = (method: string) => {
    console.log(`Sharing via ${method}`);
    setShowShareModal(false);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Referral Rewards</Text>
          <Text style={styles.subtitle}>Earn money by referring friends</Text>
        </View>

        {/* Referral Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referralStats.totalReferrals}</Text>
            <Text style={styles.statLabel}>Total Referrals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referralStats.successfulReferrals}</Text>
            <Text style={styles.statLabel}>Successful</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${referralStats.totalEarned}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${referralStats.pendingEarnings}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Code</Text>
                <Text style={styles.stepDescription}>
                  Share your referral code with friends who want to join Elite Bridge
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>They Sign Up</Text>
                <Text style={styles.stepDescription}>
                  Your friend signs up using your referral code
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>They Complete First Shift</Text>
                <Text style={styles.stepDescription}>
                  Once they complete their first shift, you both earn $50
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Get Paid</Text>
                <Text style={styles.stepDescription}>
                  Earnings are added to your account within 5 business days
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Referral Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Share this code with friends:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{referralCode}</Text>
              <TouchableOpacity style={styles.copyButton}>
                <Text style={styles.copyButtonText}>📋 Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.shareButtonsContainer}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShare("SMS")}
            >
              <Text style={styles.shareButtonText}>📱 Share via SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShare("Email")}
            >
              <Text style={styles.shareButtonText}>✉️ Share via Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShare("Social")}
            >
              <Text style={styles.shareButtonText}>📲 Share on Social</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Referral History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Referrals</Text>

          {referrals.map((referral) => (
            <View key={referral.id} style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <View>
                  <Text style={styles.referralName}>{referral.name}</Text>
                  <Text style={styles.referralDate}>{referral.earnedDate}</Text>
                </View>
                <View style={styles.referralRight}>
                  <Text style={styles.referralReward}>{referral.reward}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: referral.statusColor },
                    ]}
                  >
                    <Text style={styles.statusText}>{referral.status}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Bonus Tiers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bonus Tiers</Text>
          <View style={styles.tierContainer}>
            <View style={styles.tierCard}>
              <Text style={styles.tierName}>🥉 Bronze</Text>
              <Text style={styles.tierDescription}>5 successful referrals</Text>
              <Text style={styles.tierBonus}>+$25 Bonus</Text>
            </View>
            <View style={styles.tierCard}>
              <Text style={styles.tierName}>🥈 Silver</Text>
              <Text style={styles.tierDescription}>10 successful referrals</Text>
              <Text style={styles.tierBonus}>+$75 Bonus</Text>
            </View>
            <View style={styles.tierCard}>
              <Text style={styles.tierName}>🥇 Gold</Text>
              <Text style={styles.tierDescription}>20 successful referrals</Text>
              <Text style={styles.tierBonus}>+$200 Bonus</Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>When do I get paid?</Text>
            <Text style={styles.faqAnswer}>
              Once your referral completes their first shift, you'll earn $50. The payment is
              processed within 5 business days.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I refer unlimited people?</Text>
            <Text style={styles.faqAnswer}>
              Yes! There's no limit to how many people you can refer. The more you refer, the more
              you earn!
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What if my referral doesn't complete a shift?</Text>
            <Text style={styles.faqAnswer}>
              If your referral doesn't complete their first shift within 30 days, the referral
              expires and you won't earn the reward.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#1B5E3F",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B5E3F",
    marginBottom: 16,
  },
  stepsContainer: {
    gap: 16,
  },
  step: {
    flexDirection: "row",
    gap: 12,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B5E3F",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  stepDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    lineHeight: 20,
  },
  codeContainer: {
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 2,
    borderColor: "#1B5E3F",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1B5E3F",
    flex: 1,
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1B5E3F",
    borderRadius: 6,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  shareButtonsContainer: {
    gap: 8,
  },
  shareButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1B5E3F",
    borderRadius: 8,
    alignItems: "center",
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  referralCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  referralHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  referralName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  referralDate: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  referralRight: {
    alignItems: "flex-end",
  },
  referralReward: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1B5E3F",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  tierContainer: {
    flexDirection: "row",
    gap: 12,
  },
  tierCard: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  tierName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  tierBonus: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1B5E3F",
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
});
