import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing } from "../theme";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
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
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
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
