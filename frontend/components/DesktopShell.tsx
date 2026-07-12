import React from "react";
import { StyleSheet, View, Text, useWindowDimensions, ScrollView, Pressable } from "react-native";
import { colors, spacing, radii, shadows } from "../theme";
import { useBetSlip } from "./BetSlipContext";
import { fontSizes, fontWeights } from "../theme";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";

type Props = {
  children: React.ReactNode;
};

export function DesktopShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ competition?: string }>();
  const { width } = useWindowDimensions();
  const showThreeCols = width >= 900;
  const activeCompetition = params.competition ?? "Mundial 2026";

  const competitions = ["Mundial 2026", "LaLiga", "Champions", "ATP Wimbledon", "Moto GP"];

  function isCompetitionActive(label: string) {
    return pathname === "/matches" && activeCompetition === label;
  }

  function navigateToCompetition(label: string) {
    router.push({ pathname: "/matches", params: { competition: label } });
  }

  if (!showThreeCols) {
    return <View style={styles.mobileContainer}>{children}</View>;
  }

  const { selections, clear } = useBetSlip();

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
        <View style={styles.stubBox}>
          {selections.length === 0 ? (
            <Text style={styles.emptySlip}>Tu boleto esta vacio. Agrega una cuota para empezar.</Text>
          ) : (
            selections.map((s) => (
              <View key={s.id} style={styles.ticketItem}>
                <Text style={styles.stubText}>{s.title}</Text>
                <Text style={styles.ticketMeta}>{s.meta}</Text>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.stickyFooter}>
          <Text style={styles.stubText}>Selecciones: {selections.length}</Text>
          <View style={{ height: 8 }} />
          <Text
            style={styles.cta}
            onPress={() => {
              // mock place bet: log and clear
              // eslint-disable-next-line no-console
              console.log("Place bet with selections:", selections);
              clear();
            }}
          >
            REALIZAR APUESTA
          </Text>
          <Text
            style={styles.clear}
            onPress={() => {
              clear();
            }}
          >
            Limpiar
          </Text>
        </View>
        <View style={{ height: 12 }} />
        <Text style={styles.sideTitle}>Promociones</Text>
        <View style={styles.stubBox}>
          <Text style={styles.stubText}>Combinada boost +15%</Text>
        </View>
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
    backgroundColor: "rgba(39,224,163,0.18)",
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
  stubBox: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stubText: {
    color: colors.text,
    fontWeight: "700",
  },
  emptySlip: {
    color: colors.muted,
    lineHeight: 20,
  },
  ticketItem: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  ticketMeta: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  stickyFooter: {
    marginTop: spacing.md,
  },
  cta: {
    marginTop: 6,
    backgroundColor: colors.primary,
    color: colors.background,
    paddingVertical: 10,
    textAlign: "center",
    borderRadius: radii.sm,
    fontWeight: fontWeights.bold as any,
  },
  clear: {
    marginTop: 8,
    color: colors.accent,
    textAlign: "center",
  },
});

export default DesktopShell;
