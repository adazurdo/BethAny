import React from "react";
import { Text } from "react-native";

export function Icon({ glyph, size = 16 }: { glyph: string; size?: number }) {
  return <Text style={{ fontSize: size }}>{glyph}</Text>;
}

export default Icon;
