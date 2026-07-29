import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { tierForElo } from "../data/eloTiers";
import { radii } from "../theme";

type EloTierBadgeProps = {
  elo: number;
  size?: "sm" | "md";
};

export function EloTierBadge({ elo, size = "sm" }: EloTierBadgeProps) {
  const tier = tierForElo(elo);
  const compact = size === "sm";

  return (
    <View style={[styles.badge, { borderColor: tier.color }, compact ? styles.badgeCompact : styles.badgeLarge]}>
      <Icon glyph="shield" size={compact ? 12 : 16} color={tier.color} />
      <Text style={[styles.text, { color: tier.color }, compact ? styles.textCompact : styles.textLarge]}>{tier.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  textCompact: {
    fontSize: 10,
  },
  textLarge: {
    fontSize: 13,
  },
});
