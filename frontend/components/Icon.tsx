import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const iconMap = {
  home: "home-outline",
  profile: "person-outline",
  social: "people-outline",
  back: "arrow-back-outline",
  matches: "calendar-outline",
  ranking: "trophy-outline",
  bets: "receipt-outline",
  chevron: "chevron-forward-outline",
  elo: "trophy-outline",
  coins: "cash-outline",
} as const;

type IconName = keyof typeof iconMap;

type IconProps = {
  glyph: string;
  size?: number;
  color?: string;
  focused?: boolean;
};

export function Icon({ glyph, size = 18, color = "#fff", focused = false }: IconProps) {
  const iconName = iconMap[glyph as IconName];
  if (!iconName) {
    return <View style={{ width: size, height: size }} />;
  }

  const resolvedName = focused ? iconName.replace("-outline", "") : iconName;

  return <Ionicons name={resolvedName as React.ComponentProps<typeof Ionicons>["name"]} size={size} color={color} />;
}

export default Icon;
