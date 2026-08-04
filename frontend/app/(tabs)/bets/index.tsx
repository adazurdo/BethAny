import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, fontSizes } from "../../../theme";
import { fetchMyBets, PlacedBet } from "../../../data/bets";
import { isMatchLive } from "../../../data/matchStatus";
import { BethsIcon } from "../../../components/BethsIcon";
import { Icon } from "../../../components/Icon";
import { Tappable } from "../../../components/Tappable";
import { useStreak } from "../../../components/StreakContext";

const FALLBACK_OUTCOME_LABELS: Record<string, string> = {
  local: "Local",
  empate: "Empate",
  visitante: "Visitante",
};

// `matchLabel` is always "{homeTeamName} vs {awayTeamName}" (see backend's `_match_label`),
// so the team name for "local"/"visitante" can be read straight back out of it instead of
// showing the generic "Local"/"Visitante" the player never picked a team name for.
function outcomeLabelFor(outcome: string, matchLabel: string): string {
  const [home, away] = matchLabel.split(" vs ");
  if (outcome === "local" && home) return home;
  if (outcome === "visitante" && away) return away;
  return FALLBACK_OUTCOME_LABELS[outcome] ?? outcome;
}

const STATUS_LABELS: Record<string, string> = {
  realizada: "Pendiente",
  ganada: "Ganada",
  perdida: "Perdida",
};

const STATUS_COLORS: Record<string, string> = {
  realizada: colors.gold,
  ganada: colors.success,
  perdida: colors.danger,
};

const STATUS_ICONS: Record<string, string> = {
  realizada: "clock",
  ganada: "medal",
  perdida: "closeOutline",
};

type FilterOption = "todas" | "realizada" | "ganada" | "perdida";

const FILTERS: { value: FilterOption; label: string; icon: string }[] = [
  { value: "todas", label: "Todas", icon: "sparkles" },
  { value: "realizada", label: "Pendientes", icon: "clock" },
  { value: "ganada", label: "Ganadas", icon: "medal" },
  { value: "perdida", label: "Perdidas", icon: "closeOutline" },
];

const EMPTY_MESSAGES: Record<FilterOption, string> = {
  todas: "Todavía no has realizado ninguna apuesta",
  realizada: "No tienes apuestas pendientes de liquidar",
  ganada: "Todavía no has ganado ninguna apuesta",
  perdida: "Todavía no has perdido ninguna apuesta",
};

function formatDate(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
}

// Compact one-line headline for the collapsed card: the match(es) at a glance, without the
// full selection breakdown (that only shows once expanded).
function betHeadline(bet: PlacedBet): string {
  if (bet.betType === "combinada") {
    return `${bet.selections.length} selecciones`;
  }
  const selection = bet.selections[0];
  return selection ? `${selection.matchLabel} — ${outcomeLabelFor(selection.outcome, selection.matchLabel)}` : "Apuesta";
}

// One bet, collapsed to a compact summary row by default; tapping it expands to the full
// selection-by-selection breakdown. Each card owns its own expanded state so opening one
// never affects the others.
function BetCard({ bet }: { bet: PlacedBet }) {
  const [expanded, setExpanded] = useState(false);
  const chevronRotate = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(chevronRotate, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    if (next) {
      contentFade.setValue(0);
      Animated.timing(contentFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }

  const rotateDeg = chevronRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const statusColor = STATUS_COLORS[bet.status] ?? colors.border;

  return (
    <View style={[styles.card, { borderLeftColor: statusColor }]}>
      <Tappable style={styles.cardHeader} onPress={toggle}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardHeaderTopRow}>
            <Text style={styles.betType}>{bet.betType === "combinada" ? "Combinada" : "Simple"}</Text>
            <View style={styles.statusPill}>
              <Icon glyph={STATUS_ICONS[bet.status] ?? "clock"} size={12} color={statusColor} />
              <Text style={[styles.status, { color: statusColor }]}>{STATUS_LABELS[bet.status] ?? bet.status}</Text>
            </View>
          </View>
          <Text style={styles.headline} numberOfLines={1}>
            {betHeadline(bet)}
          </Text>
          <View style={styles.compactMetaRow}>
            <Text style={styles.compactMeta}>Cuota {bet.combinedOdds.toFixed(2)}</Text>
            <Text style={styles.compactMetaDot}>·</Text>
            <View style={styles.compactMetaValueRow}>
              <Text style={styles.compactMetaHighlight}>{bet.potentialWinnings.toFixed(2)}</Text>
              <BethsIcon size={11} color={colors.accent} />
            </View>
            {bet.eloDelta !== null ? (
              <>
                <Text style={styles.compactMetaDot}>·</Text>
                <Text style={[styles.compactMetaElo, { color: bet.eloDelta >= 0 ? colors.primary : colors.danger }]}>
                  {bet.eloDelta >= 0 ? `+${bet.eloDelta}` : bet.eloDelta} Elo
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateDeg }] }}>
          <Icon glyph="chevronDown" size={18} color={colors.muted} />
        </Animated.View>
      </Tappable>

      {expanded ? (
        <Animated.View style={[styles.cardBody, { opacity: contentFade }]}>
          <Text style={styles.createdAt}>
            {bet.settledAt ? `Liquidada ${formatDate(bet.settledAt)}` : formatDate(bet.createdAt)}
          </Text>

          {bet.selections.map((selection) => (
            <View key={`${bet.id}-${selection.matchId}`} style={styles.selectionRow}>
              <View style={styles.selectionInfo}>
                <Text style={styles.selectionLabel} numberOfLines={1}>
                  {selection.matchLabel} — {outcomeLabelFor(selection.outcome, selection.matchLabel)}
                </Text>
                {selection.matchStatus && isMatchLive(selection.matchStatus) ? (
                  <View style={styles.liveNowChip}>
                    <View style={styles.liveNowDot} />
                    <Text style={styles.liveNowChipText}>EN VIVO</Text>
                  </View>
                ) : null}
                {selection.result ? (
                  <Text style={[styles.selectionResult, { color: selection.won ? colors.success : colors.danger }]}>
                    {selection.won ? "✓" : "✗"} Resultado: {outcomeLabelFor(selection.result, selection.matchLabel)}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.selectionOdds}>{selection.odds.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Importe</Text>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>{bet.stake.toFixed(2)}</Text>
              <BethsIcon size={12} color={colors.text} />
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cuota{bet.betType === "combinada" ? " combinada" : ""}</Text>
            <Text style={styles.summaryValue}>{bet.combinedOdds.toFixed(2)}</Text>
          </View>
          {bet.eloBoostPercent !== null ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Elo Boost</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>+{bet.eloBoostPercent.toFixed(1)}% Elo</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ganancia potencial</Text>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValueHighlight}>{bet.potentialWinnings.toFixed(2)}</Text>
              <BethsIcon size={12} color={colors.accent} />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function MyBetsScreen() {
  const [bets, setBets] = useState<PlacedBet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>("todas");
  const { reportBets } = useStreak();

  useEffect(() => {
    let cancelled = false;
    fetchMyBets()
      .then((result) => {
        if (!cancelled) {
          setBets(result);
          reportBets(result);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar tus apuestas.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const base = { realizada: 0, ganada: 0, perdida: 0 };
    for (const bet of bets ?? []) {
      if (bet.status in base) base[bet.status as keyof typeof base] += 1;
    }
    return base;
  }, [bets]);

  const filteredBets = useMemo(() => {
    if (!bets) return null;
    if (filter === "todas") return bets;
    return bets.filter((bet) => bet.status === filter);
  }, [bets, filter]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mis apuestas</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!bets && !error ? <ActivityIndicator color={colors.primary} /> : null}

      {bets ? (
        <View style={styles.filterRow}>
          {FILTERS.map((option) => {
            const isActive = filter === option.value;
            const count = option.value === "todas" ? bets.length : counts[option.value as keyof typeof counts];
            return (
              <Tappable
                key={option.value}
                onPress={() => setFilter(option.value)}
                style={[styles.filterPill, isActive ? styles.filterPillActive : null]}
              >
                <Icon glyph={option.icon} size={13} color={isActive ? colors.background : colors.muted} />
                <Text style={[styles.filterPillText, isActive ? styles.filterPillTextActive : null]}>
                  {option.label} ({count})
                </Text>
              </Tappable>
            );
          })}
        </View>
      ) : null}

      {filteredBets && filteredBets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{EMPTY_MESSAGES[filter]}</Text>
          <Text style={styles.emptyText}>Elige un resultado en Partidos para empezar tu boleto.</Text>
        </View>
      ) : null}

      {filteredBets?.map((bet) => (
        <BetCard key={bet.id} bet={bet} />
      ))}
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
    gap: spacing.sm,
    paddingBottom: 96,
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.selected,
  },
  filterPillText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  filterPillTextActive: {
    color: colors.background,
  },
  emptyState: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  emptyText: {
    color: colors.muted,
    marginTop: 4,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 3,
  },
  cardHeaderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  betType: {
    color: colors.primary,
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: fontSizes.sm,
    letterSpacing: 0.4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  status: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    fontWeight: "800",
  },
  headline: {
    color: colors.text,
    fontWeight: "700",
    fontSize: fontSizes.md,
  },
  compactMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 1,
  },
  compactMeta: {
    color: colors.muted,
    fontSize: fontSizes.xs,
    fontWeight: "700",
  },
  compactMetaDot: {
    color: colors.muted,
    fontSize: fontSizes.xs,
  },
  compactMetaValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  compactMetaHighlight: {
    color: colors.accent,
    fontWeight: "900",
    fontSize: fontSizes.xs,
  },
  compactMetaElo: {
    fontWeight: "900",
    fontSize: fontSizes.xs,
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createdAt: {
    color: colors.muted,
    fontSize: fontSizes.xs,
    marginBottom: 2,
  },
  selectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectionInfo: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 2,
  },
  selectionLabel: {
    color: colors.text,
  },
  liveNowChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: "rgba(244,80,109,0.15)",
  },
  liveNowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  liveNowChipText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  selectionResult: {
    fontSize: fontSizes.xs,
    fontWeight: "700",
  },
  selectionOdds: {
    color: colors.text,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  summaryLabel: {
    color: colors.muted,
  },
  summaryValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "800",
  },
  summaryValueHighlight: {
    color: colors.accent,
    fontWeight: "900",
  },
});
