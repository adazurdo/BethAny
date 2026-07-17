import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, fontSizes, fontWeights } from "../theme";
import { useBetSlip, BetSlipTab, Selection } from "./BetSlipContext";
import type { EloPreview, QuickStakeOption } from "../data/eloPreview";
import { BethsIcon } from "./BethsIcon";

function formatOdds(value: number) {
  return value.toFixed(2);
}

function potentialWinnings(stakeRaw: string, odds: number): string | null {
  const stake = Number(stakeRaw);
  if (!Number.isFinite(stake) || stake <= 0) return null;
  return (stake * odds).toFixed(2);
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

function QuickStakeRow({ options, onPick }: { options: QuickStakeOption[]; onPick: (stake: number) => void }) {
  return (
    <View style={styles.quickRow}>
      {options.map((option) => (
        <Pressable key={option.stake} style={styles.quickButton} onPress={() => onPick(option.stake)}>
          <Text style={styles.quickButtonText}>+{option.deltaIfWin} Elo</Text>
          <Text style={styles.quickButtonSubtext}>{option.stake} B</Text>
        </Pressable>
      ))}
    </View>
  );
}

type TicketRowProps = {
  selection: Selection;
  activeTab: BetSlipTab;
  stakeValue: string;
  onStakeChange: (value: string) => void;
  onRemove: () => void;
  eloPreview: EloPreview | null;
  eloCountsToday: boolean;
  quickOptions: QuickStakeOption[];
};

// Owns its own exit animation so removing a selection visibly fades/slides it
// away instead of just vanishing from the list; the real removal only happens
// once the animation finishes.
function TicketRow({ selection, activeTab, stakeValue, onStakeChange, onRemove, eloPreview, eloCountsToday, quickOptions }: TicketRowProps) {
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
          <View style={styles.stakeRow}>
            <TextInput
              value={stakeValue}
              onChangeText={onStakeChange}
              placeholder="Importe"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={styles.stakeInput}
            />
            <View style={styles.winningsRow}>
              <Text style={styles.winnings}>{potentialWinnings(stakeValue, selection.odds) ?? "—"}</Text>
              <BethsIcon size={13} color={colors.accent} />
            </View>
          </View>
          <EloPreviewRow preview={eloPreview} countsToday={eloCountsToday} />
          <QuickStakeRow options={quickOptions} onPick={(stake) => onStakeChange(String(stake))} />
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
    quickStakeOptions,
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
        </Text>
      ) : null}

      <View style={styles.selectionsBox}>
        {selections.map((selection) => (
          <TicketRow
            key={selection.matchId}
            selection={selection}
            activeTab={activeTab}
            stakeValue={stakes[selection.matchId] ?? ""}
            onStakeChange={(value) => setStake(selection.matchId, value)}
            onRemove={() => removeSelection(selection.matchId)}
            eloPreview={eloPreview(selection.odds, stakes[selection.matchId] ?? "")}
            eloCountsToday={eloRemainingToday > 0}
            quickOptions={quickStakeOptions(selection.odds)}
          />
        ))}
      </View>

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
            <View style={styles.winningsRow}>
              <Text style={styles.winnings}>{potentialWinnings(combinadaStake, combinedOdds) ?? "—"}</Text>
              <BethsIcon size={13} color={colors.accent} />
            </View>
          </View>
          <EloPreviewRow preview={eloPreview(combinedOdds, combinadaStake)} countsToday={eloRemainingToday > 0} />
          <QuickStakeRow options={quickStakeOptions(combinedOdds)} onPick={(stake) => setCombinadaStake(String(stake))} />
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
  winningsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 64,
    justifyContent: "flex-end",
  },
  winnings: {
    color: colors.accent,
    fontWeight: "800",
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
    color: colors.primary,
    fontWeight: "800",
    fontSize: fontSizes.sm,
  },
  quickButtonSubtext: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
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
