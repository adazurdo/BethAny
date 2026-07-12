import { StyleSheet, Text, View, Animated, Pressable } from "react-native";
import { colors, radii, spacing, shadows } from "../theme";
import { useBetSlip } from "./BetSlipContext";
import { TeamBadge } from "./TeamBadge";

type TeamInfo = {
  name: string;
  crestUrl?: string;
};

type EventCardProps = {
  title: string;
  sport: string;
  league: string;
  startLabel: string;
  featured?: boolean;
  tone?: string;
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;
};

export function EventCard({ title, sport, league, startLabel, featured, tone, homeTeam, awayTeam }: EventCardProps) {
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
      <View style={styles.topRow}>
        <View style={[styles.badge, tone ? { backgroundColor: colors.surfaceSoft } : undefined]}>
          <Text style={styles.badgeText}>{sport}</Text>
        </View>
        {featured ? <Text style={styles.liveChip}>DESTACADO</Text> : null}
      </View>
      {homeTeam && awayTeam ? (
        <View style={styles.matchupRow}>
          <View style={styles.teamColumn}>
            <TeamBadge name={homeTeam.name} crestUrl={homeTeam.crestUrl} size={56} />
            <Text style={styles.teamName} numberOfLines={2}>
              {homeTeam.name}
            </Text>
          </View>
          <Text style={styles.vsLabel}>vs</Text>
          <View style={styles.teamColumn}>
            <TeamBadge name={awayTeam.name} crestUrl={awayTeam.crestUrl} size={56} />
            <Text style={styles.teamName} numberOfLines={2}>
              {awayTeam.name}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{league}</Text>
        <Text style={styles.time}>{startLabel}</Text>
      </View>
      <Animated.View style={[styles.actions, { transform: [{ scale }] }] }>
        {!isSelected ? (
          <Pressable
            onPressIn={animatePressIn}
            onPressOut={animatePressOut}
            onPress={handleAdd}
            style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.addLabel}>Apostar</Text>
            <Text style={styles.addOdd}>2.15</Text>
          </Pressable>
        ) : (
          <Pressable
            onPressIn={animatePressIn}
            onPressOut={animatePressOut}
            onPress={handleRemove}
            style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.removeLabel}>En boleto</Text>
            <Text style={styles.removeAction}>Quitar</Text>
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
    ...shadows.card,
  },
  featured: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.highlight,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  liveChip: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 2,
  },
  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 2,
  },
  teamColumn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  teamName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  vsLabel: {
    color: colors.muted,
    fontWeight: "900",
    fontSize: 12,
    marginHorizontal: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  time: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.glow,
  },
  addLabel: {
    color: colors.background,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  addOdd: {
    color: colors.background,
    fontWeight: "900",
  },
  removeButton: {
    flex: 1,
    backgroundColor: "rgba(111,132,255,0.18)",
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  removeLabel: {
    color: colors.text,
    fontWeight: "900",
  },
  removeAction: {
    color: colors.accent,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
});
