import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchGlobalRanking, GlobalRankingEntry } from "../../../data/ranking";
import { useAuth } from "../../../components/AuthContext";
import { EloTierBadge } from "../../../components/EloTierBadge";
import { Icon } from "../../../components/Icon";
import { SectionCard } from "../../../components/SectionCard";
import { Tappable } from "../../../components/Tappable";
import { accentForKey, colors, radii, spacing } from "../../../theme";

const PODIUM_COLORS = [colors.gold, colors.sky, colors.coral];

export default function RankingSection() {
  const { account } = useAuth();
  const router = useRouter();
  const [ranking, setRanking] = useState<GlobalRankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGlobalRanking()
      .then((result) => {
        if (!cancelled) setRanking(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el ranking.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="Ranking global" subtitle="Todas las cuentas ordenadas por Elo" icon="ranking" accentColor={colors.gold}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!ranking && !error ? <ActivityIndicator color={colors.primary} /> : null}
        {ranking && ranking.length === 0 ? <Text style={styles.meta}>Aun no hay cuentas en el ranking.</Text> : null}
        {ranking?.map((entry) => {
          const podiumColor = PODIUM_COLORS[entry.position - 1];
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
                  <Icon glyph="medal" size={16} color={accent} />
                ) : (
                  <Text style={[styles.position, { color: accent }]}>#{entry.position}</Text>
                )}
              </View>
              <View style={styles.rowText}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{entry.displayName}</Text>
                  {isMe ? (
                    <View style={styles.meTag}>
                      <Text style={styles.meTagText}>Tú</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.metaRow}>
                  <EloTierBadge elo={entry.elo} />
                  {entry.provisional ? (
                    <View style={styles.provisionalTag}>
                      <Icon glyph="clock" size={10} color={colors.muted} />
                      <Text style={styles.provisionalText}>Provisional</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.scoreRow}>
                <Icon glyph="elo" size={13} color={colors.gold} />
                <Text style={styles.score}>{entry.elo}</Text>
              </View>
            </Tappable>
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
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMe: {
    backgroundColor: `${colors.primary}1A`,
    borderBottomColor: colors.primary,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  provisionalTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  provisionalText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
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
