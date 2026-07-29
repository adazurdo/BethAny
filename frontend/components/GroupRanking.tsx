import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthContext";
import { EloPill } from "./EconomyBadges";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { accentForKey, colors, radii, spacing } from "../theme";
import { GroupRankingEntry } from "../data/social";

type GroupRankingProps = {
  ranking: GroupRankingEntry[];
};

const PODIUM_COLORS = [colors.gold, colors.sky, colors.coral];

export function GroupRanking({ ranking }: GroupRankingProps) {
  const { account } = useAuth();
  const router = useRouter();

  if (ranking.length === 0) {
    return <Text style={styles.emptyText}>Aun no hay miembros en el ranking.</Text>;
  }

  return (
    <View style={styles.list}>
      {ranking.map((entry, index) => {
        const podiumColor = PODIUM_COLORS[index];
        const accent = podiumColor ?? accentForKey(entry.accountId);
        const isMe = entry.accountId === account?.accountId;
        return (
          <Tappable
            key={entry.accountId}
            onPress={() => router.push(`/profile/${entry.accountId}`)}
            style={[styles.row, isMe ? styles.rowMe : null]}
          >
            <View style={[styles.positionBadge, { borderColor: accent }]}>
              {podiumColor ? (
                <Icon glyph="medal" size={14} color={accent} />
              ) : (
                <Text style={[styles.position, { color: accent }]}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.leading}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {entry.displayName}
                </Text>
                {isMe ? (
                  <View style={styles.meTag}>
                    <Text style={styles.meTagText}>Tú</Text>
                  </View>
                ) : null}
              </View>
              <EloPill elo={entry.elo} />
            </View>
            <Text style={styles.correctCount} numberOfLines={1}>
              {entry.correctCount} {entry.correctCount === 1 ? "acierto" : "aciertos"}
            </Text>
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMe: {
    backgroundColor: `${colors.primary}1A`,
    borderBottomColor: colors.primary,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  position: {
    fontWeight: "900",
    fontSize: 12,
  },
  leading: {
    flex: 1,
    gap: 4,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    flexShrink: 1,
    color: colors.text,
    fontWeight: "700",
  },
  meTag: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  meTagText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.3,
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
