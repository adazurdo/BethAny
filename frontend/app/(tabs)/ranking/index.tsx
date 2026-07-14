import { ScrollView, StyleSheet, Text, View } from "react-native";
import { globalRanking } from "../../../data";
import { colors, radii, spacing } from "../../../theme";

export default function RankingSection() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Global ranking summary</Text>
        {globalRanking.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <Text style={styles.position}>#{entry.position}</Text>
            <View style={styles.rowText}>
              <Text style={styles.name}>{entry.displayName}</Text>
              <Text style={styles.meta}>{entry.badge}</Text>
            </View>
            <Text style={styles.score}>{entry.elo}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  position: {
    width: 40,
    color: colors.primaryDark,
    fontWeight: "900",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  score: {
    color: colors.text,
    fontWeight: "900",
  },
});
