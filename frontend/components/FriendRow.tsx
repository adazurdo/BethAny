import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type FriendRowProps = {
  name: string;
  avatarUrl: string;
  sportFocus: string;
  status: string;
  selected: boolean;
  onToggle: () => void;
};

export function FriendRow({ name, avatarUrl, sportFocus, status, selected, onToggle }: FriendRowProps) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      <View style={styles.details}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{sportFocus} · {status}</Text>
      </View>
      <Pressable onPress={onToggle} style={[styles.button, selected ? styles.buttonSelected : undefined]}>
        <Text style={[styles.buttonText, selected ? styles.buttonTextSelected : undefined]}>
          {selected ? "Remove" : "Add"}
        </Text>
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
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 13,
  },
  buttonTextSelected: {
    color: colors.surface,
  },
});
