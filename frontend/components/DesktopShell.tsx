import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, useWindowDimensions, ScrollView, Pressable } from "react-native";
import { colors, spacing, radii, shadows } from "../theme";
import { BetSlipPanel } from "./BetSlipPanel";
import { BetSlipSheet } from "./BetSlipSheet";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { fetchMockCompetitions } from "../data/mockCompetitions";

type Props = {
  children: React.ReactNode;
};

// Fallback used until the football-data.org-backed competitions load, or if the
// local API is unreachable; other sports keep static mocks in this phase.
const DEFAULT_COMPETITIONS = ["Mundial 2026", "LaLiga", "Champions", "ATP Wimbledon", "Moto GP"];
const STATIC_ONLY_COMPETITIONS = ["ATP Wimbledon", "Moto GP"];

export function DesktopShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ competition?: string }>();
  const { width } = useWindowDimensions();
  const showThreeCols = width >= 900;
  const activeCompetition = params.competition ?? "Mundial 2026";

  const [footballCompetitionNames, setFootballCompetitionNames] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMockCompetitions()
      .then((sources) => {
        if (!cancelled) {
          setFootballCompetitionNames(sources.map((source) => source.displayName));
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

  const competitions = footballCompetitionNames
    ? [...footballCompetitionNames, ...STATIC_ONLY_COMPETITIONS]
    : DEFAULT_COMPETITIONS;

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
});

export default DesktopShell;
