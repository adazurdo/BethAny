import { StyleSheet, Text, View } from "react-native";
import { tierProgress } from "../data/eloTiers";
import { colors, radii, fontSizes } from "../theme";

type EloTierProgressProps = {
  elo: number;
};

// Persistent counterpart to EloTierListModal's progress banner — visible at a glance on the
// profile without needing to tap the badge open.
export function EloTierProgress({ elo }: EloTierProgressProps) {
  const progress = tierProgress(elo);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress.ratio * 100}%`, backgroundColor: progress.tier.color }]} />
      </View>
      <Text style={styles.label}>
        {progress.nextTier
          ? `Faltan ${progress.eloToNext} Elo para ${progress.nextTier.emoji} ${progress.nextTier.name}`
          : "Categoría máxima alcanzada 👑"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    gap: 4,
  },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  label: {
    color: colors.muted,
    fontSize: fontSizes.xs,
    fontWeight: "700",
  },
});
