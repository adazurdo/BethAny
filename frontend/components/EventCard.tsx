import { StyleSheet, Text, View, Animated, Pressable } from "react-native";
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

  const scale = new Animated.Value(1);

  function animatePressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 7 }).start();
  }

  function animatePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  }

  function handleAdd() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => addSelection({ id, title, meta: `${league} • ${startLabel}` }));
  }

  function handleRemove() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => removeSelection(id));
  }

  return (
    <View style={[styles.card, featured ? styles.featured : undefined]}>
      <View style={[styles.badge, tone ? { backgroundColor: colors.surface } : undefined]}>
        <Text style={styles.badgeText}>{sport}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{league}</Text>
      <Text style={styles.time}>{startLabel}</Text>
      <Animated.View style={[styles.actions, { transform: [{ scale }] }] }>
        {!isSelected ? (
          <Pressable onPressIn={animatePressIn} onPressOut={animatePressOut} onPress={handleAdd} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <Text style={styles.add}>➕ Añadir</Text>
          </Pressable>
        ) : (
          <Pressable onPressIn={animatePressIn} onPressOut={animatePressOut} onPress={handleRemove} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <Text style={styles.remove}>❌ Quitar</Text>
          </Pressable>
        )}
      </Animated.View>
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
