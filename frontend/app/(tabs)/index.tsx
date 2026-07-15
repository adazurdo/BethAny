import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { EventCard } from "../../components/EventCard";
import { SectionCard } from "../../components/SectionCard";
import { colors, radii, spacing, shadows } from "../../theme";
import { globalRanking, mockEvents } from "../../data";
import DesktopShell from "../../components/DesktopShell";

export default function HomeScreen() {
  const { account } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const featured = mockEvents.filter((event) => event.featured);
  const displayName = account?.profile.displayName ?? "bethany_fox";
  const elo = account?.profile.elo ?? 1768;

  const content = (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.kicker}>Mundial 2026</Text>
          <Text style={styles.liveChip}>En directo</Text>
        </View>
        <Text style={styles.title}>Mercados calientes y picks en vivo</Text>
        <Text style={styles.subtitle}>Bienvenido, {displayName}. Cuotas listas, ritmo rapido y ranking siempre visible.</Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Elo actual</Text>
            <Text style={styles.statValue}>{elo}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Racha</Text>
            <Text style={styles.statValue}>+4</Text>
          </View>
        </View>
      </View>

      <View style={styles.marketTabs}>
        <Text style={[styles.marketTab, styles.marketTabActive]}>Goleadores</Text>
        <Text style={styles.marketTab}>Partidos</Text>
        <Text style={styles.marketTab}>Equipos</Text>
        <Text style={styles.marketTab}>Especiales</Text>
      </View>

      <SectionCard title="Featured events" subtitle="Top stories from the current moment">
        <View style={styles.grid}>
          {featured.length > 0 ? featured.map((event, i) => <EventCard key={event.id} {...event} />) : <EmptyState />}
        </View>
      </SectionCard>

      <SectionCard title="Global ranking" subtitle="Embedded inside Home for the MVP">
        <View style={styles.rankingList}>
          {globalRanking.map((entry) => (
            <View key={entry.id} style={styles.rankingRow}>
              <Text style={styles.rankingPosition}>#{entry.position}</Text>
              <View style={styles.rankingTextBlock}>
                <Text style={styles.rankingName}>{entry.displayName}</Text>
                <Text style={styles.rankingMeta}>{entry.badge}</Text>
              </View>
              <Text style={styles.rankingScore}>{entry.elo}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScrollView>
  );

  if (isDesktop) {
    return <DesktopShell>{content}</DesktopShell>;
  }

  return content;
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No events right now</Text>
      <Text style={styles.emptyText}>The prototype would still show an empty-state card here.</Text>
    </View>
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
  hero: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    color: colors.accent,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 12,
  },
  liveChip: {
    color: colors.warning,
    fontWeight: "900",
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 22,
  },
  marketTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  marketTab: {
    color: colors.text,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    fontSize: 12,
    fontWeight: "800",
  },
  marketTabActive: {
    backgroundColor: "rgba(168,85,247,0.2)",
    borderColor: colors.primary,
    color: colors.primary,
  },
  grid: {
    gap: spacing.sm,
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
  rankingList: {
    gap: spacing.sm,
  },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  rankingPosition: {
    width: 42,
    fontWeight: "900",
    color: colors.primary,
  },
  rankingTextBlock: {
    flex: 1,
    gap: 2,
  },
  rankingName: {
    color: colors.text,
    fontWeight: "800",
  },
  rankingMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  rankingScore: {
    color: colors.text,
    fontWeight: "900",
  },
});
