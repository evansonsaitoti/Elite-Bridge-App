import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>EB</Text>
      </View>
      <View>
        <Text style={styles.title}>Elite Bridge</Text>
        <Text style={styles.subtitle}>{subtitle || "Staffing you can rely on"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "800",
  },
  title: {
    color: colors.green,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
});
