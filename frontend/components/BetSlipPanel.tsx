import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, fontSizes, fontWeights } from "../theme";
import { useBetSlip, BetSlipTab, Selection } from "./BetSlipContext";

const QUICK_AMOUNTS = [2, 5, 10, 20];

function formatOdds(value: number) {
  return value.toFixed(2);
}

function potentialWinnings(stakeRaw: string, odds: number): string | null {
  const stake = Number(stakeRaw);
  if (!Number.isFinite(stake) || stake <= 0) return null;
  return (stake * odds).toFixed(2);
}

type TicketRowProps = {
  selection: Selection;
  activeTab: BetSlipTab;
  stakeValue: string;
  onStakeChange: (value: string) => void;
  onRemove: () => void;
};

// Owns its own exit animation so removing a selection visibly fades/slides it
// away instead of just vanishing from the list; the real removal only happens
// once the animation finishes.
function TicketRow({ selection, activeTab, stakeValue, onStakeChange, onRemove }: TicketRowProps) {
  const exitAnim = useRef(new Animated.Value(1)).current;
  const [removing, setRemoving] = useState(false);

  function handleRemovePress() {
    if (removing) return;
    setRemoving(true);
    Animated.timing(exitAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onRemove();
    });
  }

  return (
    <Animated.View
      style={[
        styles.ticketItem,
        {
          opacity: exitAnim,
          transform: [
            { scale: exitAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            { translateX: exitAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          ],
        },
      ]}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle} numberOfLines={1}>
          {selection.title}
        </Text>
        <Pressable onPress={handleRemovePress} hitSlop={8}>
          <Text style={styles.removeX}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.ticketMetaRow}>
        <Text style={styles.ticketMeta}>{selection.meta}</Text>
        <Text style={styles.ticketOdds}>{formatOdds(selection.odds)}</Text>
      </View>

      {activeTab === "simple" ? (
        <View style={styles.stakeRow}>
          <TextInput
            value={stakeValue}
            onChangeText={onStakeChange}
            placeholder="Importe"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={styles.stakeInput}
          />
          <Text style={styles.winnings}>{potentialWinnings(stakeValue, selection.odds) ?? "—"} €</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

export function BetSlipPanel() {
  const {
    selections,
    activeTab,
    canCombine,
    setActiveTab,
    removeSelection,
    clear,
    stakes,
    setStake,
    combinadaStake,
    setCombinadaStake,
    combinedOdds,
    placing,
    placeError,
    placeSimple,
    placeCombinada,
  } = useBetSlip();

  const [justPlaced, setJustPlaced] = useState(false);

  useEffect(() => {
    if (!justPlaced) return;
    const timeout = setTimeout(() => setJustPlaced(false), 4000);
    return () => clearTimeout(timeout);
  }, [justPlaced]);

  // Brief "landing" bounce when a selection arrives from EventCard's fly-out
  // animation, so the boleto visibly reacts instead of just changing a number.
  const arrivalPulse = useRef(new Animated.Value(1)).current;
  const previousSelectionCount = useRef(selections.length);

  useEffect(() => {
    if (selections.length > previousSelectionCount.current) {
      arrivalPulse.setValue(1);
      Animated.sequence([
        Animated.timing(arrivalPulse, { toValue: 1.18, duration: 140, useNativeDriver: true }),
        Animated.spring(arrivalPulse, { toValue: 1, useNativeDriver: true, friction: 5 }),
      ]).start();
    }
    previousSelectionCount.current = selections.length;
  }, [selections.length]);

  async function handleConfirm() {
    const ok = activeTab === "combinada" ? await placeCombinada() : await placeSimple();
    if (ok) setJustPlaced(true);
  }

  if (selections.length === 0) {
    return (
      <View style={styles.stubBox}>
        <Text style={styles.emptySlip}>
          {justPlaced ? "¡Apuesta realizada! Consulta el detalle en Mis apuestas." : "Tu boleto esta vacio. Agrega una cuota para empezar."}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Animated.View style={[styles.tabRow, { transform: [{ scale: arrivalPulse }] }]}>
        <Pressable onPress={() => setActiveTab("simple")} style={[styles.tab, activeTab === "simple" ? styles.tabActive : null]}>
          <Text style={[styles.tabText, activeTab === "simple" ? styles.tabTextActive : null]}>Simple ({selections.length})</Text>
        </Pressable>
        {canCombine ? (
          <Pressable onPress={() => setActiveTab("combinada")} style={[styles.tab, activeTab === "combinada" ? styles.tabActive : null]}>
            <Text style={[styles.tabText, activeTab === "combinada" ? styles.tabTextActive : null]}>Combinada</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      <View style={styles.selectionsBox}>
        {selections.map((selection) => (
          <TicketRow
            key={selection.matchId}
            selection={selection}
            activeTab={activeTab}
            stakeValue={stakes[selection.matchId] ?? ""}
            onStakeChange={(value) => setStake(selection.matchId, value)}
            onRemove={() => removeSelection(selection.matchId)}
          />
        ))}
      </View>

      {activeTab === "simple" ? (
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((amount) => (
            <Pressable
              key={amount}
              style={styles.quickButton}
              onPress={() => selections.forEach((selection) => setStake(selection.matchId, String(amount)))}
            >
              <Text style={styles.quickButtonText}>{amount} €</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {activeTab === "combinada" && combinedOdds !== null ? (
        <View style={styles.combinadaBox}>
          <View style={styles.combinadaRow}>
            <Text style={styles.stubText}>Cuota combinada</Text>
            <Text style={styles.ticketOdds}>{formatOdds(combinedOdds)}</Text>
          </View>
          <View style={styles.stakeRow}>
            <TextInput
              value={combinadaStake}
              onChangeText={setCombinadaStake}
              placeholder="Importe"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={styles.stakeInput}
            />
            <Text style={styles.winnings}>{potentialWinnings(combinadaStake, combinedOdds) ?? "—"} €</Text>
          </View>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((amount) => (
              <Pressable key={amount} style={styles.quickButton} onPress={() => setCombinadaStake(String(amount))}>
                <Text style={styles.quickButtonText}>{amount} €</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {placeError ? <Text style={styles.errorText}>{placeError}</Text> : null}

      <View style={{ height: 12 }} />
      <Pressable style={[styles.cta, placing ? styles.ctaDisabled : null]} onPress={handleConfirm} disabled={placing}>
        <Text style={styles.ctaText}>{placing ? "Enviando..." : "REALIZAR APUESTA"}</Text>
      </Pressable>
      <Text style={styles.clear} onPress={clear}>
        Limpiar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stubBox: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptySlip: {
    color: colors.muted,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.sm,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontWeight: fontWeights.bold as any,
    fontSize: fontSizes.sm,
  },
  tabTextActive: {
    color: colors.background,
  },
  selectionsBox: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  ticketItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketTitle: {
    color: colors.text,
    fontWeight: "800",
    flex: 1,
  },
  removeX: {
    color: colors.muted,
    fontWeight: "900",
    paddingLeft: spacing.sm,
  },
  ticketMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  ticketMeta: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  ticketOdds: {
    color: colors.primary,
    fontWeight: "900",
  },
  stakeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  stakeInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  winnings: {
    color: colors.accent,
    fontWeight: "800",
    minWidth: 64,
    textAlign: "right",
  },
  quickRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.sm,
  },
  quickButton: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    alignItems: "center",
  },
  quickButtonText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: fontSizes.sm,
  },
  combinadaBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  combinadaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  stubText: {
    color: colors.text,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    marginTop: spacing.sm,
    fontSize: fontSizes.sm,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: colors.background,
    textAlign: "center",
    fontWeight: fontWeights.bold as any,
    paddingVertical: 10,
  },
  clear: {
    marginTop: 8,
    color: colors.accent,
    textAlign: "center",
  },
});

export default BetSlipPanel;
