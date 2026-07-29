import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { colors, radii, shadows, spacing } from "../theme";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, icon, accentColor = colors.primary, children }: SectionCardProps) {
  return (
    <View style={[styles.card, { borderColor: accentColor, shadowColor: accentColor }]}>
      <View style={[styles.accentBar, { backgroundColor: accentColor, shadowColor: accentColor }]} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon ? (
            <View style={[styles.iconBadge, { backgroundColor: `${accentColor}26`, borderColor: accentColor }]}>
              <Icon glyph={icon} size={16} color={accentColor} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 5,
  },
  accentBar: {
    height: 4,
    width: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
  },
});
