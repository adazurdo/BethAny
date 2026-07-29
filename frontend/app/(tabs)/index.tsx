import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../components/AuthContext";
import { ActivityFeed } from "../../components/ActivityFeed";
import { EconomyBadges } from "../../components/EconomyBadges";
import { EventCard } from "../../components/EventCard";
import { SectionCard } from "../../components/SectionCard";
import Icon from "../../components/Icon";
import { Tappable } from "../../components/Tappable";
import { BethsIcon } from "../../components/BethsIcon";
import { useSocialNotifications } from "../../components/SocialNotificationsContext";
import { accentForKey, colors, radii, spacing, shadows, fontSizes } from "../../theme";
import { fetchActivityFeed, ActivityEvent } from "../../data/activity";
import { fetchMyBets, PlacedBet } from "../../data/bets";
import { CompetitionSource, MockCompetitionMatch, MockTeam, fetchMockCompetitionMatches, fetchMockCompetitions } from "../../data/mockCompetitions";
import DesktopShell from "../../components/DesktopShell";

const PREFERRED_COMPETITION = "Mundial 2026";

export default function HomeScreen() {
  const router = useRouter();
  const { account } = useAuth();
  const { friendRequestCount, groupInviteCount, groupsWithUpdate } = useSocialNotifications();

  const [competitions, setCompetitions] = useState<CompetitionSource[] | null>(null);
  const [featuredCompetition, setFeaturedCompetition] = useState<string | null>(null);
  const [featuredMatches, setFeaturedMatches] = useState<MockCompetitionMatch[] | null>(null);
  const [featuredTeams, setFeaturedTeams] = useState<Map<string, MockTeam>>(new Map());
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [bets, setBets] = useState<PlacedBet[] | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMatchesLoading(true);
      try {
        const sources = await fetchMockCompetitions();
        if (cancelled) return;
        setCompetitions(sources);
        const preferred = sources.find((s) => s.displayName === PREFERRED_COMPETITION) ?? sources[0] ?? null;
        if (!preferred) {
          setFeaturedCompetition(null);
          setFeaturedMatches([]);
          return;
        }
        setFeaturedCompetition(preferred.displayName);
        const result = await fetchMockCompetitionMatches(preferred.code);
        if (cancelled) return;
        setFeaturedMatches(result.matches);
        setFeaturedTeams(new Map(result.teams.map((team) => [team.id, team])));
      } catch {
        if (!cancelled) {
          setCompetitions([]);
          setFeaturedMatches([]);
        }
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMyBets()
      .then((result) => {
        if (!cancelled) setBets(result);
      })
      .catch(() => {
        if (!cancelled) setBets([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchActivityFeed()
      .then((result) => {
        if (!cancelled) setActivity(result);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openFeaturedMatches = useMemo(() => {
    return (featuredMatches ?? [])
      .filter((match) => match.status.toLowerCase() === "scheduled" || match.status.toLowerCase() === "timed")
      .slice(0, 4);
  }, [featuredMatches]);

  const betsSummary = useMemo(() => {
    if (!bets) return null;
    return {
      count: bets.length,
      totalStake: bets.reduce((acc, bet) => acc + bet.stake, 0),
      totalPotential: bets.reduce((acc, bet) => acc + bet.potentialWinnings, 0),
    };
  }, [bets]);

  const displayName = account?.profile.displayName ?? "";
  const elo = account?.profile.elo ?? 0;
  const beths = account?.profile.beths ?? 0;
  const rankLabel = account?.profile.rankLabel || "Sin rango asignado";
  const hasSocialActivity = friendRequestCount > 0 || groupInviteCount > 0 || groupsWithUpdate.length > 0;

  function goToCompetition(label: string) {
    router.push({ pathname: "/matches", params: { competition: label } });
  }

  const content = (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.kickerRow}>
          <Icon glyph="sparkles" size={14} color={colors.accent} />
          <Text style={styles.kicker}>Bienvenido</Text>
        </View>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.subtitle}>{rankLabel}</Text>
        <EconomyBadges elo={elo} beths={beths} size="lg" />
      </View>

      {competitions && competitions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.competitionsRow}>
          {competitions.map((competition) => {
            const accent = accentForKey(competition.code);
            return (
              <Tappable
                key={competition.code}
                onPress={() => goToCompetition(competition.displayName)}
                style={[styles.competitionChip, { borderColor: accent }]}
              >
                <Icon glyph="matches" size={14} color={accent} />
                <Text style={styles.competitionChipText}>{competition.displayName}</Text>
              </Tappable>
            );
          })}
        </ScrollView>
      ) : null}

      <SectionCard
        title="Próximos partidos"
        subtitle={featuredCompetition ? `${featuredCompetition} • listos para apostar` : "Cargando competiciones..."}
        icon="matches"
        accentColor={colors.sky}
      >
        <View style={styles.grid}>
          {matchesLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : openFeaturedMatches.length > 0 ? (
            openFeaturedMatches.map((match) => (
              <EventCard
                key={match.id}
                title={`${match.homeTeamName} vs ${match.awayTeamName}`}
                sport="Football"
                league={featuredCompetition ?? ""}
                startLabel={match.kickoffLabel}
                homeTeam={{ name: match.homeTeamName, crestUrl: featuredTeams.get(match.homeTeamId)?.crestUrl }}
                awayTeam={{ name: match.awayTeamName, crestUrl: featuredTeams.get(match.awayTeamId)?.crestUrl }}
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
              <Text style={styles.emptyTitle}>No hay partidos abiertos ahora mismo</Text>
              <Text style={styles.emptyText}>Explora otras competiciones para ver más mercados.</Text>
            </View>
          )}
        </View>
        {featuredCompetition ? (
          <FooterLink label="Ver todos los partidos" onPress={() => goToCompetition(featuredCompetition)} />
        ) : null}
      </SectionCard>

      <SectionCard title="Tus apuestas" subtitle="Resumen de tu actividad reciente" icon="bets" accentColor={colors.gold}>
        {!betsSummary ? (
          <ActivityIndicator color={colors.primary} />
        ) : betsSummary.count === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Todavía no has realizado ninguna apuesta</Text>
            <Text style={styles.emptyText}>Elige un resultado en "Próximos partidos" para empezar tu boleto.</Text>
          </View>
        ) : (
          <View style={styles.summaryRows}>
            <SummaryRow label="Apuestas realizadas" value={String(betsSummary.count)} />
            <SummaryRow
              label="Importe total apostado"
              value={betsSummary.totalStake.toFixed(2)}
              icon={<BethsIcon size={12} color={colors.text} />}
            />
            <SummaryRow
              label="Ganancia potencial total"
              value={betsSummary.totalPotential.toFixed(2)}
              highlight
              icon={<BethsIcon size={12} color={colors.accent} />}
            />
          </View>
        )}
        <FooterLink label="Ver todas mis apuestas" onPress={() => router.push("/bets")} />
      </SectionCard>

      <SectionCard title="Tu progreso" subtitle="Elo, Beths y ranking global" icon="elo" accentColor={colors.pink}>
        <EconomyBadges elo={elo} beths={beths} />
        <Text style={styles.progressRank}>{rankLabel}</Text>
        <FooterLink label="Ver ranking completo" onPress={() => router.push("/ranking")} />
      </SectionCard>

      <SectionCard title="Actividad reciente" subtitle="Hitos, retos y apuestas tuyas y de tus amigos" icon="fire" accentColor={colors.pink}>
        {!activity ? <ActivityIndicator color={colors.primary} /> : <ActivityFeed events={activity.slice(0, 4)} />}
        <FooterLink label="Ver toda la actividad" onPress={() => router.push("/activity")} />
      </SectionCard>

      <SectionCard title="Actividad social" subtitle="Amigos y grupos" icon="social" accentColor={colors.teal}>
        {hasSocialActivity ? (
          <View style={styles.summaryRows}>
            {friendRequestCount > 0 ? (
              <SummaryRow label="Solicitudes de amistad pendientes" value={String(friendRequestCount)} highlight />
            ) : null}
            {groupInviteCount > 0 ? (
              <SummaryRow label="Invitaciones a grupos" value={String(groupInviteCount)} highlight />
            ) : null}
            {groupsWithUpdate.length > 0 ? (
              <SummaryRow label="Grupos con novedades" value={String(groupsWithUpdate.length)} highlight />
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Estás al día</Text>
            <Text style={styles.emptyText}>No tienes solicitudes ni invitaciones pendientes.</Text>
          </View>
        )}
        <FooterLink label="Ir a Social" onPress={() => router.push("/social")} />
      </SectionCard>
    </ScrollView>
  );

  return <DesktopShell>{content}</DesktopShell>;
}

function SummaryRow({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: ReactNode }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={styles.summaryValueRow}>
        <Text style={[styles.summaryValue, highlight ? styles.summaryValueHighlight : null]}>{value}</Text>
        {icon}
      </View>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} style={styles.footerLink}>
      <Text style={styles.footerLinkText}>{label}</Text>
      <Icon glyph="chevron" size={14} color={colors.primary} />
    </Tappable>
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
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  competitionsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  competitionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  competitionChipText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13,
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
  summaryRows: {
    gap: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  progressRank: {
    color: colors.text,
    fontWeight: "800",
    fontSize: fontSizes.md,
    marginTop: spacing.sm,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: spacing.xs,
    paddingVertical: 6,
  },
  footerLinkText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
});
