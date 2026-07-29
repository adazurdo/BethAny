import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { Tappable } from "./Tappable";
import { colors, radii, shadows, spacing } from "../theme";

type Props = {
  title: string;
  subtitle: string;
  actionLabel: string;
  icon: string;
  accentColor: string;
  onPress: () => void;
};

export function AuthChoice({ title, subtitle, actionLabel, icon, accentColor, onPress }: Props) {
  return (
    <Tappable onPress={onPress} style={[styles.card, { borderColor: accentColor }]} scaleTo={0.97}>
      <View style={[styles.iconBadge, { backgroundColor: `${accentColor}26`, borderColor: accentColor, shadowColor: accentColor }]}>
        <Icon glyph={icon} size={22} color={accentColor} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.actionRow}>
        <Text style={[styles.actionText, { color: accentColor }]}>{actionLabel}</Text>
        <Icon glyph="chevron" size={16} color={accentColor} />
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    ...shadows.card,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 4,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionText: {
    fontWeight: "900",
    fontSize: 13,
  },
});
