import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import DesktopShell from "../../../components/DesktopShell";
import { SectionCard } from "../../../components/SectionCard";
import { EventCard } from "../../../components/EventCard";
import { Icon } from "../../../components/Icon";
import { Tappable } from "../../../components/Tappable";
import {
  CompetitionSource,
  MockCompetitionMatch,
  MockTeam,
  fetchMockCompetitionMatches,
  fetchMockCompetitions,
  syncMockCompetition,
} from "../../../data/mockCompetitions";
import { colors, radii, shadows, spacing } from "../../../theme";

export default function MatchesByCompetitionScreen() {
  const params = useLocalSearchParams<{ competition?: string }>();
  const competition = params.competition ?? "Mundial 2026";

  // Only football competitions backed by football-data.org are supported now.
  const [source, setSource] = useState<CompetitionSource | null>(null);
  const [teams, setTeams] = useState<MockTeam[] | null>(null);
  const [matches, setMatches] = useState<MockCompetitionMatch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadCompetition = useCallback(async () => {
    setLoading(true);
    setSyncMessage(null);
    try {
      const competitions = await fetchMockCompetitions();
      const match = competitions.find((item) => item.displayName === competition);
      if (!match) {
        setSource(null);
        setTeams(null);
        setMatches(null);
        return;
      }
      const result = await fetchMockCompetitionMatches(match.code);
      setSource(result.source);
      setTeams(result.teams);
      setMatches(result.matches);
    } catch {
      setSource(null);
      setTeams(null);
      setMatches(null);
    } finally {
      setLoading(false);
    }
  }, [competition]);

  useEffect(() => {
    loadCompetition();
  }, [loadCompetition]);

  const teamsById = useMemo(() => {
    const map = new Map<string, MockTeam>();
    (teams ?? []).forEach((team) => map.set(team.id, team));
    return map;
  }, [teams]);

  const isStale = source?.syncStatus === "stale" || source?.syncStatus === "error";

  async function handleSync() {
    if (!source) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncMockCompetition(source.code);
      if (result.ok) {
        setTeams(result.teams);
        setMatches(result.matches);
        setSyncMessage(null);
      } else {
        setSyncMessage(result.error ?? "No se pudo sincronizar la fuente externa.");
      }
      const refreshed = await fetchMockCompetitions();
      const match = refreshed.find((item) => item.code === source.code);
      if (match) setSource(match);
    } catch {
      setSyncMessage("No se pudo contactar el backend local.");
    } finally {
      setSyncing(false);
    }
  }

  const content = (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.kickerRow}>
          <Icon glyph="matches" size={14} color={colors.accent} />
          <Text style={styles.kicker}>Competicion</Text>
        </View>
        <Text style={styles.title}>{competition}</Text>
        <Text style={styles.subtitle}>Partidos disponibles para esta seccion.</Text>

        {source ? (
          <View style={styles.syncRow}>
            <Text style={styles.syncInfo}>
              {source.lastSyncedAt ? `Ultima sincronizacion: ${new Date(source.lastSyncedAt).toLocaleString()}` : "Aun no sincronizado"}
            </Text>
            <Tappable onPress={handleSync} disabled={syncing} style={[styles.syncButton, syncing ? styles.syncButtonPressed : null]}>
              <Icon glyph="matches" size={13} color={colors.background} />
              <Text style={styles.syncButtonText}>{syncing ? "Sincronizando..." : "Actualizar partidos"}</Text>
            </Tappable>
          </View>
        ) : null}
      </View>

      {isStale ? (
        <View style={styles.staleBanner}>
          <Icon glyph="info" size={16} color={colors.warning} />
          <Text style={styles.staleText}>
            No se pudo actualizar desde football-data.org{source?.lastError ? `: ${source.lastError}` : "."} Mostrando el ultimo dataset valido.
          </Text>
        </View>
      ) : null}

      {syncMessage ? (
        <View style={styles.staleBanner}>
          <Icon glyph="info" size={16} color={colors.warning} />
          <Text style={styles.staleText}>{syncMessage}</Text>
        </View>
      ) : null}

      <SectionCard title="Partidos" subtitle={loading ? "Cargando..." : `${matches?.length ?? 0} eventos`} icon="matches" accentColor={colors.sky}>
        <View style={styles.grid}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : !source ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Competicion no disponible</Text>
              <Text style={styles.emptyText}>Selecciona otra competencia del panel izquierdo.</Text>
            </View>
          ) : matches && matches.length > 0 ? (
            matches.map((match) => (
              <EventCard
                key={match.id}
                title={`${match.homeTeamName} vs ${match.awayTeamName}`}
                sport="Football"
                league={competition}
                startLabel={match.kickoffLabel}
                featured={false}
                homeTeam={{ name: match.homeTeamName, crestUrl: teamsById.get(match.homeTeamId)?.crestUrl }}
                awayTeam={{ name: match.awayTeamName, crestUrl: teamsById.get(match.awayTeamId)?.crestUrl }}
                match={{
                  matchId: match.id,
                  homeOdds: match.homeOdds,
                  drawOdds: match.drawOdds,
                  awayOdds: match.awayOdds,
                  status: match.status,
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No hay partidos disponibles en esta competencia</Text>
              <Text style={styles.emptyText}>football-data.org todavia no tiene partidos publicados para esta competencia. Prueba a sincronizar mas tarde.</Text>
              <Tappable onPress={handleSync} disabled={syncing} style={[styles.syncButton, syncing ? styles.syncButtonPressed : null]}>
                <Icon glyph="matches" size={13} color={colors.background} />
                <Text style={styles.syncButtonText}>{syncing ? "Sincronizando..." : "Sincronizar ahora"}</Text>
              </Tappable>
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
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  syncRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  syncInfo: {
    color: colors.muted,
    fontSize: 12,
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
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,184,77,0.12)",
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  staleText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.sky,
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...shadows.glow,
  },
  syncButtonPressed: {
    opacity: 0.85,
  },
  syncButtonText: {
    color: colors.background,
    fontWeight: "900",
  },
});
