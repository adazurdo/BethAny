import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { ActivityFeed } from "../../../components/ActivityFeed";
import { SectionCard } from "../../../components/SectionCard";
import { fetchActivityFeed, ActivityEvent } from "../../../data/activity";
import { colors, spacing } from "../../../theme";

export default function ActivityScreen() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchActivityFeed()
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar la actividad.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard
        title="Actividad reciente"
        subtitle="Hitos, retos, apuestas y predicciones tuyas y de tus amigos"
        icon="fire"
        accentColor={colors.pink}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!events && !error ? <ActivityIndicator color={colors.primary} /> : null}
        {events ? <ActivityFeed events={events} /> : null}
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
});
