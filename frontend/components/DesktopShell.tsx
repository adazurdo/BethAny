import React from "react";
import { StyleSheet, View, Text, useWindowDimensions, ScrollView } from "react-native";
import { colors, spacing, radii } from "../theme";
import { useBetSlip } from "./BetSlipContext";
import { fontSizes, fontWeights } from "../theme";

type Props = {
  children: React.ReactNode;
};

export function DesktopShell({ children }: Props) {
  const { width } = useWindowDimensions();
  const showThreeCols = width >= 900;

  if (!showThreeCols) {
    return <View style={styles.mobileContainer}>{children}</View>;
  }

  const { selections, clear } = useBetSlip();

  return (
    <View style={styles.container}>
      <View style={styles.leftNav}>
        <Text style={styles.brand}>BethAny</Text>
        <View style={styles.navList}>
          <Text style={styles.navItem}>Inicio</Text>
          <Text style={styles.navItem}>Ranking</Text>
          <Text style={styles.navItem}>Grupos</Text>
          <Text style={styles.navItem}>Perfil</Text>
        </View>
      </View>

      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {children}
      </ScrollView>

      <View style={styles.rightRail}>
        <Text style={styles.sideTitle}>Boleto de apuestas (mock)</Text>
        <View style={styles.stubBox}>
          {selections.length === 0 ? (
            <Text style={styles.stubText}>Añade selecciones desde los partidos</Text>
          ) : (
            selections.map((s) => (
              <View key={s.id} style={{ marginBottom: 10 }}>
                <Text style={styles.stubText}>{s.title}</Text>
                <Text style={{ color: colors.muted, fontSize: fontSizes.sm }}>{s.meta}</Text>
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
          <Text style={styles.stubText}>Mega cuotas</Text>
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
  },
  brand: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 20,
    marginBottom: spacing.md,
  },
  navList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  navItem: {
    color: colors.text,
    fontWeight: "800",
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
  },
  sideTitle: {
    color: colors.primary,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
  stubBox: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    borderRadius: radii.sm,
  },
  stubText: {
    color: colors.text,
    fontWeight: "700",
  },
  stickyFooter: {
    marginTop: spacing.md,
  },
  cta: {
    marginTop: 6,
    backgroundColor: colors.primary,
    color: colors.surface,
    paddingVertical: 10,
    textAlign: "center",
    borderRadius: 10,
    fontWeight: fontWeights.bold as any,
  },
  clear: {
    marginTop: 8,
    color: colors.muted,
    textAlign: "center",
  },
});

export default DesktopShell;
