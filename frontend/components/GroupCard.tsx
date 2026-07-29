import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { NotificationBadge } from "./NotificationBadge";
import { Tappable } from "./Tappable";
import { accentForKey, colors, radii, spacing } from "../theme";

type GroupCardProps = {
  id: string;
  name: string;
  memberCount: number;
  hasUpdate?: boolean;
  onPress: () => void;
};

export function GroupCard({ id, name, memberCount, hasUpdate = false, onPress }: GroupCardProps) {
  const accent = accentForKey(id);
  return (
    <Tappable onPress={onPress} style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: `${accent}26`, borderColor: accent }]}>
        <Icon glyph="groups" size={18} color={accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          {hasUpdate ? <NotificationBadge inline /> : null}
        </View>
        <Text style={styles.meta}>
          {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
        </Text>
      </View>
      <Icon glyph="chevron" size={16} color={colors.muted} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
