import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, shadows, spacing, fontSizes, fontWeights } from "../theme";
import { useBetSlip, BetSlipTab, Selection } from "./BetSlipContext";
import type { EloPreview } from "../data/eloPreview";

function formatOdds(value: number) {
  return value.toFixed(2);
}

function EloPreviewRow({ preview, countsToday }: { preview: EloPreview | null; countsToday: boolean }) {
  if (!preview) return null;
  return (
    <View style={styles.eloPreviewRow}>
      <Text style={styles.eloPreviewText}>
        Si aciertas: <Text style={styles.eloPreviewWin}>+{preview.deltaIfWin} Elo</Text> · Si fallas:{" "}
        <Text style={styles.eloPreviewLose}>{preview.deltaIfLose} Elo</Text>
      </Text>
      {!countsToday ? <Text style={styles.eloPreviewCap}>Hoy ya no cuenta para tu Elo (límite diario alcanzado)</Text> : null}
    </View>
  );
}

// Lets the player type the exact Beths amount to stake - digits only, and clamped to
// maxStake so a typo can't stage a bet the account could never afford (the server enforces
// this either way, this is purely UX).
function StakeAmountInput({ value, onChange, maxStake }: { value: string; onChange: (value: string) => void; maxStake: number }) {
  function handleChangeText(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, "");
    if (digitsOnly === "") {
      onChange("");
      return;
    }
    const clamped = Math.min(Number(digitsOnly), maxStake);
    onChange(String(clamped));
  }

  return (
    <View style={styles.stakeInputRow}>
      <Text style={styles.stakeInputLabel}>Cuánto quieres apostar</Text>
      <View style={styles.stakeInputBox}>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={styles.stakeInput}
        />
        <Text style={styles.stakeInputSuffix}>B</Text>
      </View>
      {maxStake > 0 ? <Text style={styles.stakeInputHint}>Máximo {maxStake} B</Text> : null}
    </View>
  );
}

type TicketRowProps = {
  selection: Selection;
  activeTab: BetSlipTab;
  stakeValue: string;
  onChangeStake: (value: string) => void;
  onRemove: () => void;
  eloPreview: EloPreview | null;
  eloCountsToday: boolean;
  maxStake: number;
};

// Owns its own exit animation so removing a selection visibly fades/slides it
// away instead of just vanishing from the list; the real removal only happens
// once the animation finishes.
function TicketRow({
  selection,
  activeTab,
  stakeValue,
  onChangeStake,
  onRemove,
  eloPreview,
  eloCountsToday,
  maxStake,
}: TicketRowProps) {
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
        <>
          <StakeAmountInput value={stakeValue} onChange={onChangeStake} maxStake={maxStake} />
          <EloPreviewRow preview={eloPreview} countsToday={eloCountsToday} />
        </>
      ) : null}
    </Animated.View>
  );
}

export function BetSlipPanel() {
  const {
    selections,
    activeTab,
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
    eloPreview,
    eloRemainingToday,
    maxStake,
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
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>
            {activeTab === "combinada" ? "Combinada" : `Simple (${selections.length})`}
          </Text>
        </View>
      </Animated.View>
      {activeTab === "combinada" ? (
        <Text style={styles.combinadaHint}>
          Con 2 o más selecciones solo puedes apostar al total de la combinada, no a cada parte por separado.
          {selections.length >= 3 ? " Al confirmar, esta combinada puede desbloquear un Elo Boost de hasta el 20% extra sobre el Elo que ganes si aciertas." : ""}
        </Text>
      ) : null}

      <View style={styles.selectionsBox}>
        {selections.map((selection) => (
          <TicketRow
            key={selection.matchId}
            selection={selection}
            activeTab={activeTab}
            stakeValue={stakes[selection.matchId] ?? ""}
            onChangeStake={(value) => setStake(selection.matchId, value)}
            onRemove={() => removeSelection(selection.matchId)}
            eloPreview={eloPreview(selection.odds, stakes[selection.matchId] ?? "")}
            eloCountsToday={eloRemainingToday > 0}
            maxStake={maxStake}
          />
        ))}
      </View>

      {activeTab === "combinada" && combinedOdds !== null ? (
        <View style={styles.combinadaBox}>
          <View style={styles.combinadaRow}>
            <Text style={styles.stubText}>Cuota combinada</Text>
            <Text style={styles.ticketOdds}>{formatOdds(combinedOdds)}</Text>
          </View>
          <StakeAmountInput value={combinadaStake} onChange={setCombinadaStake} maxStake={maxStake} />
          <EloPreviewRow preview={eloPreview(combinedOdds, combinadaStake)} countsToday={eloRemainingToday > 0} />
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
    ...shadows.selected,
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
  stakeInputRow: {
    marginTop: spacing.sm,
  },
  stakeInputLabel: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    fontWeight: "700",
    marginBottom: 4,
  },
  stakeInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  stakeInput: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
    paddingVertical: 10,
  },
  stakeInputSuffix: {
    color: colors.muted,
    fontWeight: "700",
  },
  stakeInputHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  eloPreviewRow: {
    marginTop: 4,
  },
  eloPreviewText: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  eloPreviewWin: {
    color: colors.primary,
    fontWeight: "800",
  },
  eloPreviewLose: {
    color: colors.danger,
    fontWeight: "800",
  },
  eloPreviewCap: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    fontStyle: "italic",
    marginTop: 2,
  },
  combinadaHint: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    marginTop: 4,
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
    ...shadows.glow,
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
