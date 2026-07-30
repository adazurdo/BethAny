import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, fontSizes } from "../../../theme";
import { fetchMyBets, PlacedBet } from "../../../data/bets";
import { BethsIcon } from "../../../components/BethsIcon";
import { Icon } from "../../../components/Icon";
import { Tappable } from "../../../components/Tappable";
import { useStreak } from "../../../components/StreakContext";

const OUTCOME_LABELS: Record<string, string> = {
  local: "Local",
  empate: "Empate",
  visitante: "Visitante",
};

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
        <View key={bet.id} style={[styles.card, { borderBottomColor: STATUS_COLORS[bet.status] ?? colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.betType}>{bet.betType === "combinada" ? "Combinada" : "Simple"}</Text>
            <View style={styles.statusPill}>
              <Icon glyph={STATUS_ICONS[bet.status] ?? "clock"} size={13} color={STATUS_COLORS[bet.status] ?? colors.muted} />
              <Text style={[styles.status, { color: STATUS_COLORS[bet.status] ?? colors.muted }]}>
                {STATUS_LABELS[bet.status] ?? bet.status}
              </Text>
            </View>
          </View>
          <Text style={styles.createdAt}>
            {bet.settledAt ? `Liquidada ${formatDate(bet.settledAt)}` : formatDate(bet.createdAt)}
          </Text>

          {bet.selections.map((selection) => (
            <View key={`${bet.id}-${selection.matchId}`} style={styles.selectionRow}>
              <View style={styles.selectionInfo}>
                <Text style={styles.selectionLabel} numberOfLines={1}>
                  {selection.matchLabel} — {OUTCOME_LABELS[selection.outcome] ?? selection.outcome}
                </Text>
                {selection.result ? (
                  <Text style={[styles.selectionResult, { color: selection.won ? colors.success : colors.danger }]}>
                    {selection.won ? "✓" : "✗"} Resultado: {OUTCOME_LABELS[selection.result] ?? selection.result}
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ganancia potencial</Text>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValueHighlight}>{bet.potentialWinnings.toFixed(2)}</Text>
              <BethsIcon size={12} color={colors.accent} />
            </View>
          </View>
        </View>
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
    gap: spacing.md,
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
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    gap: 6,
  },
  cardHeader: {
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
  createdAt: {
    color: colors.muted,
    fontSize: fontSizes.xs,
    marginBottom: 4,
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
