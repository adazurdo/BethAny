import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type TeamBadgeProps = {
  name: string;
  crestUrl?: string;
  size?: number;
};

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (trimmed.toUpperCase() === "TBD") return "TBD";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TeamBadge({ name, crestUrl, size = 28 }: TeamBadgeProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size };

  if (crestUrl && !failed) {
    return (
      <Image
        source={{ uri: crestUrl }}
        style={dimension}
        resizeMode="contain"
        onError={() => setFailed(true)}
        accessibilityLabel={`Escudo de ${name}`}
      />
    );
  }

  return (
    <View style={[styles.placeholder, dimension, { borderRadius: size / 2 }]}>
      <Text style={[styles.placeholderText, { fontSize: size * 0.38 }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.muted,
    fontWeight: "900",
  },
});

export default TeamBadge;
