import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, fontSizes } from "../../../theme";
import { fetchMyBets, PlacedBet } from "../../../data/bets";

const OUTCOME_LABELS: Record<string, string> = {
  local: "Local",
  empate: "Empate",
  visitante: "Visitante",
};

function formatDate(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
}

export default function MyBetsScreen() {
  const [bets, setBets] = useState<PlacedBet[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyBets()
      .then((result) => {
        if (!cancelled) setBets(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar tus apuestas.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mis apuestas</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!bets && !error ? <ActivityIndicator color={colors.primary} /> : null}

      {bets && bets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Todavía no has realizado ninguna apuesta</Text>
          <Text style={styles.emptyText}>Elige un resultado en Partidos para empezar tu boleto.</Text>
        </View>
      ) : null}

      {bets?.map((bet) => (
        <View key={bet.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.betType}>{bet.betType === "combinada" ? "Combinada" : "Simple"}</Text>
            <Text style={styles.status}>{bet.status}</Text>
          </View>
          <Text style={styles.createdAt}>{formatDate(bet.createdAt)}</Text>

          {bet.selections.map((selection) => (
            <View key={`${bet.id}-${selection.matchId}`} style={styles.selectionRow}>
              <Text style={styles.selectionLabel} numberOfLines={1}>
                {selection.matchLabel} — {OUTCOME_LABELS[selection.outcome] ?? selection.outcome}
              </Text>
              <Text style={styles.selectionOdds}>{selection.odds.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Importe</Text>
            <Text style={styles.summaryValue}>{bet.stake.toFixed(2)} €</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cuota{bet.betType === "combinada" ? " combinada" : ""}</Text>
            <Text style={styles.summaryValue}>{bet.combinedOdds.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ganancia potencial</Text>
            <Text style={styles.summaryValueHighlight}>{bet.potentialWinnings.toFixed(2)} €</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  betType: {
    color: colors.primary,
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: fontSizes.sm,
    letterSpacing: 0.4,
  },
  status: {
    color: colors.muted,
    fontSize: fontSizes.sm,
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
  selectionLabel: {
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
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
  summaryValue: {
    color: colors.text,
    fontWeight: "800",
  },
  summaryValueHighlight: {
    color: colors.accent,
    fontWeight: "900",
  },
});
