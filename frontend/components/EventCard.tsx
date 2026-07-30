import { useRef, useState } from "react";
import { StyleSheet, Text, View, Animated, Pressable } from "react-native";
import { accentForKey, colors, radii, spacing, shadows } from "../theme";
import { useBetSlip } from "./BetSlipContext";
import { BetOutcome } from "../data/bets";
import { Icon } from "./Icon";
import { TeamBadge } from "./TeamBadge";

type TeamInfo = {
  name: string;
  crestUrl?: string;
};

type MatchOdds = {
  matchId: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  status: string;
};

type EventCardProps = {
  title: string;
  sport: string;
  league: string;
  startLabel: string;
  featured?: boolean;
  homeTeam?: TeamInfo;
  awayTeam?: TeamInfo;
  match: MatchOdds;
};

const OUTCOME_LABELS: Record<BetOutcome, string> = {
  local: "Local",
  empate: "Empate",
  visitante: "Visitante",
};

const OUTCOME_ODDS_KEYS: Record<BetOutcome, keyof MatchOdds> = {
  local: "homeOdds",
  empate: "drawOdds",
  visitante: "awayOdds",
};

export function EventCard({ title, sport, league, startLabel, featured, homeTeam, awayTeam, match }: EventCardProps) {
  const { addSelection, isSelected } = useBetSlip();

  const scale = new Animated.Value(1);
  const isOpenForBetting = match.status.toLowerCase() === "scheduled" || match.status.toLowerCase() === "timed";

  // "Flies" a small copy of the tapped odd up and away, toward where the
  // boleto lives (the desktop right rail, or the mobile "Ver boleto" access
  // point), as a lightweight confirmation that the selection was added.
  // It is decorative only: it never delays or gates the real addSelection call.
  const [flying, setFlying] = useState<{ key: number; text: string } | null>(null);
  const flyAnim = useRef(new Animated.Value(0)).current;
  const flyKey = useRef(0);

  function animatePressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 7 }).start();
  }

  function animatePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  }

  function launchFlyToBoleto(text: string) {
    flyKey.current += 1;
    const key = flyKey.current;
    setFlying({ key, text });
    flyAnim.setValue(0);
    Animated.timing(flyAnim, { toValue: 1, duration: 550, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        setFlying((current) => (current?.key === key ? null : current));
      }
    });
  }

  function handlePickOutcome(outcome: BetOutcome) {
    if (!isOpenForBetting) return;
    const odds = match[OUTCOME_ODDS_KEYS[outcome]] as number;
    const isAdding = !isSelected(match.matchId, outcome);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => addSelection({ matchId: match.matchId, title, meta: `${league} • ${startLabel}`, outcome, odds }));
    if (isAdding) {
      launchFlyToBoleto(odds.toFixed(2));
    }
  }

  const sportAccent = accentForKey(sport);

  return (
    <View style={[styles.card, { borderBottomColor: sportAccent }, featured ? styles.featured : undefined]}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: sportAccent }]}>
          <Text style={styles.badgeText}>{sport}</Text>
        </View>
        {featured ? (
          <View style={styles.liveChip}>
            <Icon glyph="fire" size={12} color={colors.warning} />
            <Text style={styles.liveChipText}>DESTACADO</Text>
          </View>
        ) : null}
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

      <Animated.View style={[styles.outcomesRow, { transform: [{ scale }] }]}>
        {(["local", "empate", "visitante"] as BetOutcome[]).map((outcome) => {
          const selected = isSelected(match.matchId, outcome);
          const odds = match[OUTCOME_ODDS_KEYS[outcome]] as number;
          return (
            <Pressable
              key={outcome}
              onPressIn={animatePressIn}
              onPressOut={animatePressOut}
              onPress={() => handlePickOutcome(outcome)}
              disabled={!isOpenForBetting}
              style={({ pressed }) => [
                styles.outcomeButton,
                selected ? styles.outcomeButtonSelected : null,
                !isOpenForBetting ? styles.outcomeButtonDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              {selected ? (
                <View style={styles.selectedBadge}>
                  <Icon glyph="check" size={12} color={colors.background} />
                </View>
              ) : null}
              <Text style={[styles.outcomeLabel, selected ? styles.outcomeLabelSelected : null]}>{OUTCOME_LABELS[outcome]}</Text>
              <Text style={[styles.outcomeOdds, selected ? styles.outcomeLabelSelected : null]}>{isOpenForBetting ? odds.toFixed(2) : "—"}</Text>
            </Pressable>
          );
        })}
      </Animated.View>

      {flying ? (
        <Animated.View
          key={flying.key}
          pointerEvents="none"
          style={[
            styles.flyingPill,
            {
              opacity: flyAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: flyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -110] }) },
                { translateX: flyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 70] }) },
                { scale: flyAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
              ],
            },
          ]}
        >
          <Text style={styles.flyingPillText}>{flying.text}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    overflow: "visible",
  },
  flyingPill: {
    position: "absolute",
    bottom: 14,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...shadows.glow,
  },
  flyingPillText: {
    color: colors.background,
    fontWeight: "900",
    fontSize: 13,
  },
  featured: {
    borderBottomColor: colors.primary,
    borderBottomWidth: 3,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveChipText: {
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
  outcomesRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 6,
  },
  outcomeButton: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "visible",
  },
  outcomeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.selected,
  },
  selectedBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  outcomeButtonDisabled: {
    opacity: 0.5,
  },
  outcomeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  outcomeLabelSelected: {
    color: colors.background,
  },
  outcomeOdds: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.9,
  },
});
