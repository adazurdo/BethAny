import React, { useEffect, useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { colors, radii, shadows, spacing, fontSizes } from "../theme";

export type StreakKind = "win" | "loss";

type Props = {
  kind: StreakKind | null;
  onClose: () => void;
};

const CONFETTI_COLORS = [colors.primary, colors.pink, colors.gold, colors.sky, colors.success, colors.coral];
const CONFETTI_COUNT = 70;
const AUTO_DISMISS_MS = 4200;

function ConfettiPiece({ index, width, height }: { index: number; width: number; height: number }) {
  const progress = useSharedValue(0);

  const startX = useMemo(() => Math.random() * width, [width]);
  const drift = useMemo(() => (Math.random() - 0.5) * 180, []);
  const pieceWidth = useMemo(() => 5 + Math.random() * 5, []);
  const pieceHeight = pieceWidth * 2.2;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const duration = useMemo(() => 2200 + Math.random() * 1400, []);
  const delay = useMemo(() => Math.random() * 500, []);
  const spinDeg = useMemo(() => 360 * (2 + Math.random() * 3) * (Math.random() > 0.5 ? 1 : -1), []);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => {
    const translateY = -20 + progress.value * (height + 40);
    const translateX = progress.value * drift;
    const rotate = `${progress.value * spinDeg}deg`;
    const opacity = progress.value < 0.85 ? 1 : 1 - (progress.value - 0.85) / 0.15;
    return {
      opacity,
      transform: [{ translateY }, { translateX }, { rotate }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        { left: startX, width: pieceWidth, height: pieceHeight, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function StreakCelebrationModal({ kind, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const visible = kind !== null;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, kind]);

  if (!visible) return null;

  const isWin = kind === "win";

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {isWin ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
              <ConfettiPiece key={i} index={i} width={width} height={height} />
            ))}
          </View>
        ) : null}

        <Pressable style={[styles.card, isWin ? styles.cardWin : styles.cardLoss]} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.emoji}>{isWin ? "🔥" : "😮‍💨"}</Text>
          <Text style={styles.title}>{isWin ? "¡Estás en racha!" : "Creo que alguien está tilteado…"}</Text>
          <Text style={styles.subtitle}>
            {isWin ? "4 apuestas ganadas seguidas. ¡Sigue así!" : "4 apuestas perdidas seguidas. Quizá toca frenar un poco."}
          </Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  confettiPiece: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
  },
  card: {
    width: 300,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  cardWin: {
    borderColor: colors.success,
  },
  cardLoss: {
    borderColor: colors.danger,
  },
  emoji: {
    fontSize: 42,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: fontSizes.xl,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: colors.background,
    fontWeight: "800",
  },
});
