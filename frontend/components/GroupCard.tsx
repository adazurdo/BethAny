import { Pressable, StyleSheet, Text, View } from "react-native";
import { NotificationBadge } from "./NotificationBadge";
import { colors, radii, spacing } from "../theme";

type GroupCardProps = {
  name: string;
  memberCount: number;
  hasUpdate?: boolean;
  onPress: () => void;
};

export function GroupCard({ name, memberCount, hasUpdate = false, onPress }: GroupCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        {hasUpdate ? <NotificationBadge inline /> : null}
      </View>
      <Text style={styles.meta}>{memberCount} {memberCount === 1 ? "miembro" : "miembros"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
});
