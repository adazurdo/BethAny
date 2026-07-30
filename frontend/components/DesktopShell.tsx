import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, useWindowDimensions, ScrollView, Pressable } from "react-native";
import { colors, spacing, radii, shadows } from "../theme";
import { BetSlipPanel } from "./BetSlipPanel";
import { BetSlipSheet } from "./BetSlipSheet";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { fetchMockCompetitions } from "../data/mockCompetitions";
import { useStreak } from "./StreakContext";
import { useAuth } from "./AuthContext";
import { EconomyBadges } from "./EconomyBadges";

type Props = {
  children: React.ReactNode;
};

// Fallback used until the football-data.org-backed competitions load, or if the local API
// is unreachable. Football-only: no other sport is backed by real data right now.
const DEFAULT_COMPETITIONS = ["Mundial 2026", "LaLiga", "Champions"];

export function DesktopShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ competition?: string }>();
  const { width } = useWindowDimensions();
  const showThreeCols = width >= 900;
  const activeCompetition = params.competition ?? "Mundial 2026";

  const [footballCompetitionNames, setFootballCompetitionNames] = useState<string[] | null>(null);
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
          setFootballCompetitionNames(sources.filter((source) => source.hasRealFixtures).map((source) => source.displayName));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFootballCompetitionNames(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const competitions = footballCompetitionNames ?? DEFAULT_COMPETITIONS;

  function isCompetitionActive(label: string) {
    return pathname === "/matches" && activeCompetition === label;
  }

  function navigateToCompetition(label: string) {
    router.push({ pathname: "/matches", params: { competition: label } });
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
        <Text style={styles.brand}>BETHANY SPORTS</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchText}>Buscar mercados</Text>
        </View>
        <View style={styles.economyRow}>
          <EconomyBadges elo={elo} beths={beths} stacked />
        </View>
        <Text style={styles.sideSubtitle}>Competiciones destacadas</Text>
        <View style={styles.navList}>
          {competitions.map((competition) => {
            const active = isCompetitionActive(competition);
            return (
              <Pressable
                key={competition}
                onPress={() => navigateToCompetition(competition)}
                style={({ pressed }) => [styles.navItem, active ? styles.navItemActive : null, pressed ? styles.navItemPressed : null]}
              >
                <Text style={[styles.navItemText, active ? styles.navItemTextActive : null]}>{competition}</Text>
              </Pressable>
            );
          })}
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
      </View>

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {children}
      </ScrollView>

      <View style={styles.rightRail}>
        <Text style={styles.sideTitle}>Tu boleto</Text>
        <BetSlipPanel />
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
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: "100%",
    ...shadows.card,
  },
  brand: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 19,
    marginBottom: spacing.sm,
    letterSpacing: 0.6,
  },
  searchBox: {
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
  searchText: {
    color: colors.muted,
    fontSize: 13,
  },
  sideSubtitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  navList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  navItemPressed: {
    opacity: 0.9,
  },
  navItemText: {
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
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: "100%",
    ...shadows.card,
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
