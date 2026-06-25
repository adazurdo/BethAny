import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ProfileSummary } from "../../components/ProfileSummary";
import { SectionCard } from "../../components/SectionCard";
import { colors, radii, spacing } from "../../theme";
import { globalRanking, mockProfile } from "../../data";

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageLabel}>Profile</Text>
      <ProfileSummary {...mockProfile} />

      <SectionCard title="Global ranking snapshot" subtitle="Shown here without a separate tab">
        <View style={styles.rankingList}>
          {globalRanking.slice(0, 3).map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.rank}>{entry.position}</Text>
              <View style={styles.rowText}>
                <Text style={styles.name}>{entry.displayName}</Text>
                <Text style={styles.meta}>{entry.badge}</Text>
              </View>
              <Text style={styles.score}>{entry.elo}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 96,
  },
  pageLabel: {
    color: colors.primaryDark,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  rankingList: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 28,
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
