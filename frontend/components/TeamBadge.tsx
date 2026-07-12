import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type TeamBadgeProps = {
  name: string;
  crestUrl?: string;
  size?: number;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TeamBadge({ name, crestUrl, size = 28 }: TeamBadgeProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (crestUrl && !failed) {
    return (
      <Image
        source={{ uri: crestUrl }}
        style={[styles.image, dimension]}
        resizeMode="contain"
        onError={() => setFailed(true)}
        accessibilityLabel={`Escudo de ${name}`}
      />
    );
  }

  return (
    <View style={[styles.placeholder, dimension]}>
      <Text style={[styles.placeholderText, { fontSize: size * 0.38 }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceSoft,
  },
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
