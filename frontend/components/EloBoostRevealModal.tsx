import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, fontSizes } from "../theme";
import type { PlacedBet } from "../data/bets";
import { BethsIcon } from "./BethsIcon";

type Props = {
  bet: PlacedBet | null;
  onClose: () => void;
};

const MIN_PERCENT = 2;
const MAX_PERCENT = 20;
const SEGMENT_COUNT = 9;
const SEGMENT_SPAN = (MAX_PERCENT - MIN_PERCENT) / SEGMENT_COUNT; // 2 percentage points per pocket
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT; // 40deg per pocket, measured clockwise from the top

const WHEEL_SIZE = 220;
const RADIUS = WHEEL_SIZE / 2;
const LABEL_RADIUS = RADIUS - 34;
const CHIP_SIZE = 38;
const POINTER_HEIGHT = 16;

const SPIN_DURATION_MS = 3200;
const EXTRA_SPINS = 5;

// One color per pocket, cycling through the theme's neon-purple family so the wheel still
// reads "on brand" instead of a generic rainbow roulette.
const WHEEL_COLORS = [
  colors.primary,
  colors.teal,
  colors.pink,
  colors.sky,
  colors.gold,
  colors.coral,
  colors.lime,
  colors.primaryDark,
  colors.highlight,
];

const SEGMENTS = Array.from({ length: SEGMENT_COUNT }, (_, i) => i);

function segmentIndexForPercent(percent: number): number {
  const raw = Math.floor((percent - MIN_PERCENT) / SEGMENT_SPAN);
  return Math.max(0, Math.min(SEGMENT_COUNT - 1, raw));
}

function pocketValue(index: number): number {
  return Math.round(MIN_PERCENT + SEGMENT_SPAN * (index + 0.5));
}

function pocketCenterAngle(index: number): number {
  return index * SEGMENT_ANGLE;
}

// How far (in degrees, clockwise) the wheel must turn from its resting position so that
// pocket `index`'s center ends up under the fixed pointer at the top, plus a few extra full
// spins so it visibly "spins" rather than just snapping there.
function targetRotationForIndex(index: number): number {
  const normalized = (360 - pocketCenterAngle(index)) % 360;
  return EXTRA_SPINS * 360 + normalized;
}

// Shown once a combinada with 3+ distinct matches comes back from the server with an Elo
// boost already rolled (see BetSlipContext.placeCombinada) - the bet is already placed and
// non-editable, so this is purely a reveal: a roulette wheel spins, decelerating, and lands on
// the pocket containing the real value the server already committed to.
export function EloBoostRevealModal({ bet, onClose }: Props) {
  const visible = bet !== null && bet.eloBoostPercent != null;
  const finalPercent = bet?.eloBoostPercent ?? 0;
  const [settled, setSettled] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const landPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setSettled(false);
    rotation.setValue(0);
    landPulse.setValue(1);

    const index = segmentIndexForPercent(finalPercent);
    const target = targetRotationForIndex(index);
    const spin = Animated.timing(rotation, {
      toValue: target,
      duration: SPIN_DURATION_MS,
      easing: Easing.bezier(0.1, 0.7, 0.15, 1),
      useNativeDriver: true,
    });
    spin.start(({ finished }) => {
      if (finished) setSettled(true);
    });
    return () => spin.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, bet?.id]);

  useEffect(() => {
    if (!settled) return;
    landPulse.setValue(0.85);
    Animated.spring(landPulse, { toValue: 1, useNativeDriver: true, friction: 4, tension: 80 }).start();
  }, [settled]);

  if (!visible || !bet) return null;

  const boostedOdds = bet.boostedOdds ?? bet.combinedOdds;
  const rotateDeg = rotation.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"], extrapolate: "extend" });

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => settled && onClose()}>
      <Pressable style={styles.backdrop} onPress={() => settled && onClose()}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.eyebrow}>COMBINADA DE {bet.selections.length} · BONUS DESBLOQUEADO</Text>
          <Text style={styles.title}>Elo Boost</Text>

          <View style={styles.wheelContainer}>
            <View style={styles.pointer} />
            <Animated.View style={[styles.wheel, { transform: [{ rotate: rotateDeg }] }]}>
              {SEGMENTS.map((i) => (
                <View
                  key={`divider-${i}`}
                  style={[styles.divider, { transform: [{ rotate: `${pocketCenterAngle(i) + SEGMENT_ANGLE / 2}deg` }] }]}
                />
              ))}
              {SEGMENTS.map((i) => (
                <View
                  key={`chip-${i}`}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length],
                      transform: [
                        { rotate: `${pocketCenterAngle(i)}deg` },
                        { translateY: -LABEL_RADIUS },
                        { rotate: `${-pocketCenterAngle(i)}deg` },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.chipText}>{pocketValue(i)}%</Text>
                </View>
              ))}
              <View style={styles.hub} />
            </Animated.View>
          </View>

          {settled ? (
            <>
              <Animated.Text style={[styles.resultPercent, { transform: [{ scale: landPulse }] }]}>
                +{finalPercent.toFixed(1)}%
              </Animated.Text>
              <View style={styles.oddsRow}>
                <Text style={styles.oddsFrom}>{bet.combinedOdds.toFixed(2)}</Text>
                <Text style={styles.oddsArrow}>→</Text>
                <Text style={styles.oddsTo}>{boostedOdds.toFixed(2)}</Text>
              </View>
              <View style={styles.winningsRow}>
                <Text style={styles.winningsLabel}>Ganancia potencial</Text>
                <View style={styles.winningsValueRow}>
                  <Text style={styles.winningsValue}>{bet.potentialWinnings.toFixed(2)}</Text>
                  <BethsIcon size={13} color={colors.accent} />
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Genial</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.subtitle}>Girando la ruleta...</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 300,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    ...shadows.glow,
  },
  eyebrow: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: fontSizes.xl,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE + POINTER_HEIGHT,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  pointer: {
    position: "absolute",
    top: 0,
    left: RADIUS - 10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: POINTER_HEIGHT,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.text,
    zIndex: 5,
  },
  wheel: {
    position: "absolute",
    top: POINTER_HEIGHT,
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: RADIUS,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
    ...shadows.glow,
  },
  divider: {
    position: "absolute",
    top: 0,
    left: RADIUS - 0.75,
    width: 1.5,
    height: WHEEL_SIZE,
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  chip: {
    position: "absolute",
    top: RADIUS - CHIP_SIZE / 2,
    left: RADIUS - CHIP_SIZE / 2,
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    color: colors.background,
    fontWeight: "900",
    fontSize: 12,
  },
  hub: {
    position: "absolute",
    top: RADIUS - 14,
    left: RADIUS - 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  resultPercent: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  oddsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  oddsFrom: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: fontSizes.lg,
    textDecorationLine: "line-through",
  },
  oddsArrow: {
    color: colors.muted,
    fontWeight: "700",
  },
  oddsTo: {
    color: colors.text,
    fontWeight: "900",
    fontSize: fontSizes.lg,
  },
  winningsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  winningsLabel: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: fontSizes.sm,
  },
  winningsValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  winningsValue: {
    color: colors.text,
    fontWeight: "900",
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    ...shadows.glow,
  },
  closeButtonText: {
    color: colors.background,
    fontWeight: "800",
  },
});

export default EloBoostRevealModal;
