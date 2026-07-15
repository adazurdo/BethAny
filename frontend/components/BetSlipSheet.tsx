import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, shadows } from "../theme";
import { useBetSlip } from "./BetSlipContext";
import { BetSlipPanel } from "./BetSlipPanel";

// Mobile equivalent of DesktopShell's "Tu boleto" right rail, which only
// renders at desktop widths (>= 900). Reuses BetSlipContext/BetSlipPanel so
// every calculation is defined once and shared by both surfaces.
export function BetSlipSheet() {
  const { selections } = useBetSlip();
  const [visible, setVisible] = useState(false);

  // Brief "landing" bounce on the FAB when a selection arrives, mirroring
  // EventCard's fly-out animation and BetSlipPanel's own arrival pulse.
  const arrivalPulse = useRef(new Animated.Value(1)).current;
  const previousSelectionCount = useRef(selections.length);

  useEffect(() => {
    if (selections.length > previousSelectionCount.current) {
      arrivalPulse.setValue(1);
      Animated.sequence([
        Animated.timing(arrivalPulse, { toValue: 1.15, duration: 140, useNativeDriver: true }),
        Animated.spring(arrivalPulse, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();
    }
    previousSelectionCount.current = selections.length;
  }, [selections.length]);

  if (selections.length === 0) return null;

  return (
    <>
      <Pressable style={styles.fabPosition} onPress={() => setVisible(true)}>
        <Animated.View style={[styles.fab, { transform: [{ scale: arrivalPulse }] }]}>
          <Text style={styles.fabText}>Ver boleto ({selections.length})</Text>
        </Animated.View>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Tu boleto</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={8}>
                <Text style={styles.close}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
              <BetSlipPanel />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabPosition: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
    ...shadows.glow,
  },
  fabText: {
    color: colors.background,
    fontWeight: "900",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  close: {
    color: colors.accent,
    fontWeight: "800",
  },
  content: {
    padding: spacing.md,
  },
});

export default BetSlipSheet;
