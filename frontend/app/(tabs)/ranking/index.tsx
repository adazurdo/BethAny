import { ScrollView, StyleSheet, Text, View } from "react-native";
import { globalRanking } from "../../../data";
import { Icon } from "../../../components/Icon";
import { SectionCard } from "../../../components/SectionCard";
import { accentForKey, colors, radii, spacing } from "../../../theme";

const PODIUM_COLORS = [colors.gold, colors.sky, colors.coral];

export default function RankingSection() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="Global ranking summary" subtitle="Los mejores Elo del servidor" icon="ranking" accentColor={colors.gold}>
        {globalRanking.map((entry) => {
          const podiumColor = PODIUM_COLORS[entry.position - 1];
          const accent = podiumColor ?? accentForKey(entry.id);
          return (
            <View key={entry.id} style={styles.row}>
              <View style={[styles.positionBadge, { borderColor: accent }]}>
                {podiumColor ? (
                  <Icon glyph="medal" size={16} color={accent} />
                ) : (
                  <Text style={[styles.position, { color: accent }]}>#{entry.position}</Text>
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name}>{entry.displayName}</Text>
                <Text style={styles.meta}>{entry.badge}</Text>
              </View>
              <View style={styles.scoreRow}>
                <Icon glyph="elo" size={13} color={colors.gold} />
                <Text style={styles.score}>{entry.elo}</Text>
              </View>
            </View>
          );
        })}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  positionBadge: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  position: {
    fontWeight: "900",
    fontSize: 12,
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
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  score: {
    color: colors.text,
    fontWeight: "900",
  },
});
