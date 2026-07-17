import { StyleSheet, Text, View } from "react-native";
import Icon from "./Icon";
import { BethsIcon } from "./BethsIcon";
import { BethsCountdown } from "./BethsCountdown";
import { colors, radii, shadows, spacing } from "../theme";

type EconomyBadgesProps = {
  elo: number;
  beths: number;
  size?: "md" | "lg";
};

export function EconomyBadges({ elo, beths, size = "md" }: EconomyBadgesProps) {
  const large = size === "lg";
  return (
    <View style={styles.row}>
      <View style={[styles.badge, styles.eloBadge, large ? styles.badgeLarge : null]}>
        <Icon glyph="elo" size={large ? 24 : 18} color={colors.primary} />
        <View>
          <Text style={styles.label}>Elo</Text>
          <Text style={[styles.value, large ? styles.valueLarge : null, { color: colors.primary }]}>{elo}</Text>
        </View>
      </View>
      <View style={[styles.badge, styles.bethsBadge, large ? styles.badgeLarge : null]}>
        <BethsIcon size={large ? 24 : 18} color={colors.warning} />
        <View>
          <Text style={styles.label}>Beths</Text>
          <Text style={[styles.value, large ? styles.valueLarge : null, { color: colors.warning }]}>{beths}</Text>
          <BethsCountdown color={colors.muted} />
        </View>
      </View>
    </View>
  );
}

type EloPillProps = {
  elo: number;
  size?: number;
};

// Compact single-stat badge for list rows (group ranking, member lists) where the full
// two-badge EconomyBadges row would be too heavy — same violet/trophy identity, smaller frame.
export function EloPill({ elo, size = 13 }: EloPillProps) {
  return (
    <View style={pillStyles.pill}>
      <Icon glyph="elo" size={size} color={colors.primary} />
      <Text style={[pillStyles.value, { fontSize: size }]}>{elo}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  value: {
    color: colors.primary,
    fontWeight: "900",
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.glow,
  },
  eloBadge: {
    borderColor: colors.primary,
  },
  bethsBadge: {
    borderColor: colors.warning,
  },
  badgeLarge: {
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontWeight: "900",
    fontSize: 20,
  },
  valueLarge: {
    fontSize: 28,
  },
});
