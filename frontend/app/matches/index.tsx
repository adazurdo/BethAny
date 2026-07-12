import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import DesktopShell from "../../components/DesktopShell";
import { SectionCard } from "../../components/SectionCard";
import { EventCard } from "../../components/EventCard";
import { mockEvents } from "../../data";
import { colors, radii, spacing } from "../../theme";

export default function MatchesByCompetitionScreen() {
  const params = useLocalSearchParams<{ competition?: string }>();
  const competition = params.competition ?? "Mundial 2026";

  const competitionEvents = useMemo(() => {
    return mockEvents.filter((event) => event.league === competition);
  }, [competition]);

  const content = (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Competicion</Text>
        <Text style={styles.title}>{competition}</Text>
        <Text style={styles.subtitle}>Partidos mock disponibles para esta seccion.</Text>
      </View>

      <SectionCard title="Partidos" subtitle={`${competitionEvents.length} eventos mock`}>
        <View style={styles.grid}>
          {competitionEvents.length > 0 ? (
            competitionEvents.map((event) => <EventCard key={event.id} {...event} />)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No hay partidos mock en esta competencia</Text>
              <Text style={styles.emptyText}>Selecciona otra competencia del panel izquierdo.</Text>
            </View>
          )}
        </View>
      </SectionCard>
    </ScrollView>
  );

  return <DesktopShell>{content}</DesktopShell>;
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  kicker: {
    color: colors.accent,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
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
});
