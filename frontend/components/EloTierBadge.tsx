import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { EloTierListModal } from "./EloTierListModal";
import { tierForElo, withAlpha } from "../data/eloTiers";
import { radii } from "../theme";

type EloTierBadgeProps = {
  elo: number;
  size?: "sm" | "md" | "xl";
};

const SIZE_STYLES = {
  sm: { badge: "badgeCompact", text: "textCompact", emoji: "emojiCompact" },
  md: { badge: "badgeLarge", text: "textLarge", emoji: "emojiLarge" },
  xl: { badge: "badgeHero", text: "textHero", emoji: "emojiHero" },
} as const;

// Tapping the badge anywhere it's shown (ranking, own profile, a friend's profile) opens the
// full ladder so "what Elo do I need for the next category" is always one tap away.
export function EloTierBadge({ elo, size = "sm" }: EloTierBadgeProps) {
  const tier = tierForElo(elo);
  const variant = SIZE_STYLES[size];
  const [listVisible, setListVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setListVisible(true)}
        style={[
          styles.badge,
          { borderColor: tier.color, backgroundColor: withAlpha(tier.color, "22") },
          styles[variant.badge],
          size === "xl" ? { shadowColor: tier.color } : null,
        ]}
      >
        <Text style={styles[variant.emoji]}>{tier.emoji}</Text>
        <Text style={[styles.text, { color: tier.color }, styles[variant.text]]}>{tier.name}</Text>
      </Pressable>
      <EloTierListModal visible={listVisible} onClose={() => setListVisible(false)} elo={elo} />
    </>
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
  badgeHero: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 2,
    gap: 8,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
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
  textHero: {
    fontSize: 17,
    letterSpacing: 0.6,
  },
  emojiCompact: {
    fontSize: 11,
  },
  emojiLarge: {
    fontSize: 15,
  },
  emojiHero: {
    fontSize: 22,
  },
});
