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
  // Added for the colorful/iconography pass across Social, Retos, and status displays.
  friends: "people-circle-outline",
  groups: "albums-outline",
  challenge: "flash-outline",
  add: "add-circle-outline",
  check: "checkmark-circle",
  checkOutline: "checkmark-circle-outline",
  close: "close-circle",
  closeOutline: "close-circle-outline",
  cancel: "ban-outline",
  clock: "time-outline",
  fire: "flame-outline",
  star: "star",
  starOutline: "star-outline",
  coin: "logo-bitcoin",
  medal: "medal-outline",
  swords: "flash-outline",
  target: "locate-outline",
  vs: "swap-horizontal-outline",
  sparkles: "sparkles-outline",
  send: "paper-plane-outline",
  remove: "person-remove-outline",
  info: "information-circle-outline",
  personAdd: "person-add-outline",
  login: "log-in-outline",
  lock: "lock-closed-outline",
  mail: "mail-outline",
  edit: "create-outline",
  wallet: "wallet-outline",
  settings: "settings-outline",
  logout: "log-out-outline",
  shield: "shield-outline",
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
