import { StyleSheet, Text, View } from "react-native";
import { EloPill } from "./EconomyBadges";
import { colors, spacing } from "../theme";
import { GroupRankingEntry } from "../data/social";

type GroupRankingProps = {
  ranking: GroupRankingEntry[];
};

export function GroupRanking({ ranking }: GroupRankingProps) {
  if (ranking.length === 0) {
    return <Text style={styles.emptyText}>Aun no hay miembros en el ranking.</Text>;
  }

  return (
    <View style={styles.list}>
      {ranking.map((entry, index) => (
        <View key={entry.accountId} style={styles.row}>
          <View style={styles.leading}>
            <Text style={styles.position}>{index + 1}</Text>
            <Text style={styles.displayName} numberOfLines={1}>
              {entry.displayName}
            </Text>
            <EloPill elo={entry.elo} />
          </View>
          <Text style={styles.correctCount} numberOfLines={1}>
            {entry.correctCount} {entry.correctCount === 1 ? "acierto" : "aciertos"}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  leading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  position: {
    color: colors.muted,
    fontWeight: "800",
    width: 18,
  },
  displayName: {
    flexShrink: 1,
    color: colors.text,
    fontWeight: "700",
  },
  correctCount: {
    flexShrink: 0,
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
  },
  emptyText: {
    color: colors.muted,
  },
});
