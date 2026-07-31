import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, TextInput, Image, ActivityIndicator, useWindowDimensions, ScrollView, Pressable } from "react-native";
import { colors, spacing, radii, shadows } from "../theme";
import { BetSlipPanel } from "./BetSlipPanel";
import { BetSlipSheet } from "./BetSlipSheet";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { fetchMockCompetitionMatches, fetchMockCompetitions } from "../data/mockCompetitions";
import { useStreak } from "./StreakContext";
import { useAuth } from "./AuthContext";
import { EconomyBadges } from "./EconomyBadges";
import { Icon } from "./Icon";

type Props = {
  children: React.ReactNode;
};

type CompetitionSummary = {
  code: string;
  displayName: string;
  sport: string;
  // Real emblem (football-data.org). Null for esports competitions, which fall back to
  // GAME_ICON_URL below since PandaScore exposes no per-videogame icon of its own.
  iconUrl: string | null;
};

type LeagueSummary = {
  name: string;
  imageUrl: string | null;
};

// Fallback used until the real (football-data.org / PandaScore backed) competitions load,
// or if the local API is unreachable.
const DEFAULT_COMPETITIONS: CompetitionSummary[] = [
  { code: "mundial-2026", displayName: "Mundial 2026", sport: "Football", iconUrl: null },
  { code: "laliga", displayName: "LaLiga", sport: "Football", iconUrl: null },
  { code: "champions", displayName: "Champions", sport: "Football", iconUrl: null },
];

// Known sports get a friendly label/icon/fixed ordering; anything else (future sports added
// to CONFIGURED_COMPETITIONS) still renders, alphabetically, with a generic icon.
const SPORT_ORDER = ["Football", "Esports"];
const SPORT_LABEL: Record<string, string> = { Football: "Fútbol", Esports: "Esports" };
const SPORT_ICON: Record<string, string> = { Football: "football", Esports: "esports" };

// PandaScore exposes no per-videogame icon via its API (only team/league images), so these are
// static official logos: CS2/Dota 2 from Valve's own Steam CDN (appids 730/570); League of
// Legends/Valorant have no stable Riot-hosted static icon, so these mirror the official artwork
// via Wikimedia Commons instead.
const GAME_ICON_URL: Record<string, string> = {
  cs2: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
  dota2: "https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg",
  lol: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/250px-League_of_Legends_2019_vector.svg.png",
  valorant:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/250px-Valorant_logo_-_pink_color_version.svg.png",
};

function iconForCompetition(item: CompetitionSummary): string | null {
  return item.iconUrl ?? GAME_ICON_URL[item.code] ?? null;
}

function CompetitionIcon({ uri, fallbackGlyph, size = 18 }: { uri: string | null; fallbackGlyph: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 3 }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return <Icon glyph={fallbackGlyph} size={size * 0.75} color={colors.muted} />;
}

function groupBySport(items: CompetitionSummary[]): Array<[string, CompetitionSummary[]]> {
  const groups = new Map<string, CompetitionSummary[]>();
  for (const item of items) {
    const list = groups.get(item.sport);
    if (list) {
      list.push(item);
    } else {
      groups.set(item.sport, [item]);
    }
  }
  const sports = Array.from(groups.keys()).sort((a, b) => {
    const orderA = SPORT_ORDER.indexOf(a);
    const orderB = SPORT_ORDER.indexOf(b);
    if (orderA !== -1 && orderB !== -1) return orderA - orderB;
    if (orderA !== -1) return -1;
    if (orderB !== -1) return 1;
    return a.localeCompare(b);
  });
  return sports.map((sport) => [sport, groups.get(sport)!]);
}

export function DesktopShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ competition?: string; league?: string }>();
  const { width } = useWindowDimensions();
  const showThreeCols = width >= 900;
  const activeCompetition = params.competition ?? "Mundial 2026";
  const activeLeague = params.league ?? null;

  const [realCompetitions, setRealCompetitions] = useState<CompetitionSummary[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSports, setCollapsedSports] = useState<Set<string>>(new Set());
  const [expandedCompetitions, setExpandedCompetitions] = useState<Set<string>>(new Set());
  const [leaguesByCompetition, setLeaguesByCompetition] = useState<Record<string, LeagueSummary[] | "loading">>({});
  const { triggerTestStreak } = useStreak();
  const { account } = useAuth();
  const elo = account?.profile.elo ?? 0;
  const beths = account?.profile.beths ?? 0;

  useEffect(() => {
    let cancelled = false;
    fetchMockCompetitions()
      .then((sources) => {
        if (!cancelled) {
          // Only list competitions that currently have real fixtures (e.g. a finished or
          // not-yet-scheduled tournament like Mundial 2026 has none) so the sidebar never
          // links to an empty "Partidos" screen.
          setRealCompetitions(
            sources
              .filter((source) => source.hasRealFixtures)
              .map((source) => ({ code: source.code, displayName: source.displayName, sport: source.sport, iconUrl: source.iconUrl }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRealCompetitions(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const competitions = realCompetitions ?? DEFAULT_COMPETITIONS;

  const query = searchQuery.trim().toLowerCase();
  const filteredCompetitions = query
    ? competitions.filter(
        (item) => item.displayName.toLowerCase().includes(query) || item.sport.toLowerCase().includes(query)
      )
    : competitions;
  const sportGroups = useMemo(() => groupBySport(filteredCompetitions), [filteredCompetitions]);
  const isSearching = query.length > 0;

  function isCompetitionActive(label: string) {
    return pathname === "/matches" && activeCompetition === label && !activeLeague;
  }

  function isLeagueActive(competitionLabel: string, leagueName: string) {
    return pathname === "/matches" && activeCompetition === competitionLabel && activeLeague === leagueName;
  }

  function navigateToCompetition(label: string) {
    router.push({ pathname: "/matches", params: { competition: label } });
  }

  function navigateToLeague(competitionLabel: string, leagueName: string) {
    router.push({ pathname: "/matches", params: { competition: competitionLabel, league: leagueName } });
  }

  function toggleCompetitionExpansion(item: CompetitionSummary) {
    setExpandedCompetitions((prev) => {
      const next = new Set(prev);
      if (next.has(item.code)) {
        next.delete(item.code);
      } else {
        next.add(item.code);
      }
      return next;
    });
    if (item.sport === "Esports" && !leaguesByCompetition[item.code]) {
      setLeaguesByCompetition((prev) => ({ ...prev, [item.code]: "loading" }));
      fetchMockCompetitionMatches(item.code)
        .then((result) => {
          const seen = new Map<string, LeagueSummary>();
          for (const match of result.matches) {
            if (match.leagueName && !seen.has(match.leagueName)) {
              seen.set(match.leagueName, { name: match.leagueName, imageUrl: match.leagueImageUrl });
            }
          }
          const leagues = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
          setLeaguesByCompetition((prev) => ({ ...prev, [item.code]: leagues }));
        })
        .catch(() => {
          setLeaguesByCompetition((prev) => ({ ...prev, [item.code]: [] }));
        });
    }
  }

  function toggleSport(sport: string) {
    setCollapsedSports((prev) => {
      const next = new Set(prev);
      if (next.has(sport)) {
        next.delete(sport);
      } else {
        next.add(sport);
      }
      return next;
    });
  }

  if (!showThreeCols) {
    return (
      <View style={styles.mobileContainer}>
        {children}
        <BetSlipSheet />
        <View style={styles.debugFloating}>
          <Pressable style={[styles.debugButton, styles.debugButtonWin]} onPress={() => triggerTestStreak("win")}>
            <Text style={styles.debugButtonText}>Racha win</Text>
          </Pressable>
          <Pressable style={[styles.debugButton, styles.debugButtonLoss]} onPress={() => triggerTestStreak("loss")}>
            <Text style={styles.debugButtonText}>Racha loose</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.leftNav}>
        <ScrollView contentContainerStyle={styles.leftNavContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>BETHANY SPORTS</Text>
        <View style={styles.searchBox}>
          <Icon glyph="search" size={14} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar deportes o competiciones"
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.economyRow}>
          <EconomyBadges elo={elo} beths={beths} stacked />
        </View>
        <Text style={styles.sideSubtitle}>Explorar deportes</Text>
        <View style={styles.sportGroups}>
          {sportGroups.map(([sport, items]) => {
            const expanded = isSearching || !collapsedSports.has(sport);
            return (
              <View key={sport} style={styles.sportGroup}>
                <Pressable style={styles.sportHeader} onPress={() => toggleSport(sport)}>
                  <Icon glyph={SPORT_ICON[sport] ?? "shield"} size={16} color={colors.accent} />
                  <Text style={styles.sportHeaderText}>{SPORT_LABEL[sport] ?? sport}</Text>
                  <Icon glyph={expanded ? "chevronDown" : "chevron"} size={14} color={colors.muted} />
                </Pressable>
                {expanded ? (
                  <View style={styles.navList}>
                    {items.map((item) => {
                      const active = isCompetitionActive(item.displayName);
                      const isEsports = item.sport === "Esports";
                      const competitionExpanded = expandedCompetitions.has(item.code);
                      const leagues = leaguesByCompetition[item.code];
                      return (
                        <View key={item.code}>
                          <View style={styles.competitionRow}>
                            <Pressable
                              onPress={() => navigateToCompetition(item.displayName)}
                              style={({ pressed }) => [
                                styles.navItem,
                                active ? styles.navItemActive : null,
                                pressed ? styles.navItemPressed : null,
                              ]}
                            >
                              <CompetitionIcon uri={iconForCompetition(item)} fallbackGlyph={SPORT_ICON[item.sport] ?? "shield"} />
                              <Text style={[styles.navItemText, active ? styles.navItemTextActive : null]} numberOfLines={1}>
                                {item.displayName}
                              </Text>
                            </Pressable>
                            {isEsports ? (
                              <Pressable
                                onPress={() => toggleCompetitionExpansion(item)}
                                hitSlop={8}
                                style={styles.competitionChevron}
                              >
                                <Icon glyph={competitionExpanded ? "chevronDown" : "chevron"} size={12} color={colors.muted} />
                              </Pressable>
                            ) : null}
                          </View>
                          {isEsports && competitionExpanded ? (
                            <View style={styles.leagueList}>
                              {leagues === "loading" ? (
                                <ActivityIndicator color={colors.primary} size="small" />
                              ) : leagues && leagues.length > 0 ? (
                                leagues.map((league) => {
                                  const leagueActive = isLeagueActive(item.displayName, league.name);
                                  return (
                                    <Pressable
                                      key={league.name}
                                      onPress={() => navigateToLeague(item.displayName, league.name)}
                                      style={({ pressed }) => [
                                        styles.leagueItem,
                                        leagueActive ? styles.navItemActive : null,
                                        pressed ? styles.navItemPressed : null,
                                      ]}
                                    >
                                      <CompetitionIcon uri={league.imageUrl} fallbackGlyph="esports" size={14} />
                                      <Text
                                        style={[styles.leagueItemText, leagueActive ? styles.navItemTextActive : null]}
                                        numberOfLines={1}
                                      >
                                        {league.name}
                                      </Text>
                                    </Pressable>
                                  );
                                })
                              ) : (
                                <Text style={styles.emptyText}>Sin ligas disponibles</Text>
                              )}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
          {sportGroups.length === 0 ? (
            <Text style={styles.emptyText}>Sin resultados para "{searchQuery}"</Text>
          ) : null}
        </View>

        <Text style={styles.sideSubtitle}>Debug (provisional)</Text>
        <View style={styles.debugGroup}>
          <Pressable style={[styles.debugButton, styles.debugButtonWin]} onPress={() => triggerTestStreak("win")}>
            <Text style={styles.debugButtonText}>Racha win</Text>
          </Pressable>
          <Pressable style={[styles.debugButton, styles.debugButtonLoss]} onPress={() => triggerTestStreak("loss")}>
            <Text style={styles.debugButtonText}>Racha loose</Text>
          </Pressable>
        </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {children}
      </ScrollView>

      <View style={styles.rightRail}>
        <ScrollView contentContainerStyle={styles.rightRailContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sideTitle}>Tu boleto</Text>
          <BetSlipPanel />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  leftNav: {
    width: 260,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: "100%",
    overflow: "hidden",
    ...shadows.card,
  },
  leftNavContent: {
    padding: spacing.md,
  },
  brand: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 19,
    marginBottom: spacing.sm,
    letterSpacing: 0.6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  economyRow: {
    marginTop: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    padding: 0,
  },
  sideSubtitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sportGroups: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  sportGroup: {
    gap: spacing.sm,
  },
  sportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sportHeaderText: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
    fontSize: 13,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  navList: {
    gap: spacing.sm,
  },
  competitionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  competitionChevron: {
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  navItemPressed: {
    opacity: 0.9,
  },
  navItemText: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
  },
  navItemActive: {
    backgroundColor: "rgba(168,85,247,0.18)",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  navItemTextActive: {
    color: colors.primary,
  },
  leagueList: {
    marginTop: spacing.xs,
    marginLeft: spacing.md,
    gap: 6,
  },
  leagueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  leagueItemText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  main: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mainContent: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
  },
  rightRail: {
    width: 340,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: "100%",
    overflow: "hidden",
    ...shadows.card,
  },
  rightRailContent: {
    padding: spacing.md,
  },
  sideTitle: {
    color: colors.text,
    fontWeight: "900",
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  debugGroup: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  debugFloating: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    gap: spacing.sm,
    zIndex: 20,
  },
  debugButton: {
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  debugButtonWin: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: colors.success,
  },
  debugButtonLoss: {
    backgroundColor: "rgba(244,80,109,0.15)",
    borderColor: colors.danger,
  },
  debugButtonText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 12,
  },
});

export default DesktopShell;
