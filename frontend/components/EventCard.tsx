import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

type EventCardProps = {
  title: string;
  sport: string;
  league: string;
  startLabel: string;
  featured?: boolean;
  tone?: string;
};

export function EventCard({ title, sport, league, startLabel, featured, tone }: EventCardProps) {
  return (
    <View style={[styles.card, featured ? styles.featured : undefined]}>
      <View style={[styles.badge, tone ? { backgroundColor: colors.surfaceSoft } : undefined]}>
        <Text style={styles.badgeText}>{sport}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{league}</Text>
      <Text style={styles.time}>{startLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featured: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  time: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
});
