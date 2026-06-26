import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { useBetSlip } from "./BetSlipContext";

type EventCardProps = {
  title: string;
  sport: string;
  league: string;
  startLabel: string;
  featured?: boolean;
  tone?: string;
};

export function EventCard({ title, sport, league, startLabel, featured, tone }: EventCardProps) {
  const { addSelection, removeSelection, selections } = useBetSlip();

  const id = title;
  const isSelected = selections.some((s) => s.id === id);

  function handleAdd() {
    addSelection({ id, title, meta: `${league} • ${startLabel}` });
  }

  function handleRemove() {
    removeSelection(id);
  }

  return (
    <View style={[styles.card, featured ? styles.featured : undefined]}>
      <View style={[styles.badge, tone ? { backgroundColor: colors.surface } : undefined]}>
        <Text style={styles.badgeText}>{sport}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{league}</Text>
      <Text style={styles.time}>{startLabel}</Text>
      <View style={styles.actions}>
        {!isSelected ? (
          <Text style={styles.add} onPress={handleAdd}>
            ➕ Añadir
          </Text>
        ) : (
          <Text style={styles.remove} onPress={handleRemove}>
            ❌ Quitar
          </Text>
        )}
      </View>
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
    ...{
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 18,
      elevation: 6,
    },
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
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
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
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 12,
  },
  add: {
    color: colors.primary,
    fontWeight: "800",
  },
  remove: {
    color: colors.muted,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
});
