import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "../../components/AuthContext";
import { EventCard } from "../../components/EventCard";
import { SectionCard } from "../../components/SectionCard";
import { colors, radii, spacing } from "../../theme";
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
        <Text style={styles.kicker}>BethAny</Text>
        <Text style={styles.title}>Predict better. Compete louder.</Text>
        <Text style={styles.subtitle}>
          Welcome back, {displayName}. Your account keeps bets, elo, profile, and friends ready for the next session.
        </Text>
        <Text style={styles.heroStat}>Elo actual: {elo}</Text>
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
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  kicker: {
    color: colors.surface,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.surface,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.surface,
    fontSize: 16,
    lineHeight: 24,
  },
  heroStat: {
    color: colors.surface,
    fontWeight: "900",
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankingPosition: {
    width: 42,
    fontWeight: "900",
    color: colors.primaryDark,
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
