import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

type FriendRowProps = {
  displayName: string;
  avatarUrl: string;
  elo: number;
  onRemove: () => void;
};

export function FriendRow({ displayName, avatarUrl, elo, onRemove }: FriendRowProps) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      <View style={styles.details}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.meta}>Elo {elo}</Text>
      </View>
      <Pressable onPress={onRemove} style={styles.button}>
        <Text style={styles.buttonText}>Eliminar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
  },
  button: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 13,
  },
});
