import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, fontSizes, fontWeights } from "../theme";
import { useBetSlip, BetSlipTab, Selection } from "./BetSlipContext";
import type { EloPreview, QuickStakeOption } from "../data/eloPreview";
import { BethsIcon } from "./BethsIcon";

function formatOdds(value: number) {
  return value.toFixed(2);
}

// Winning only ever gives back the stake risked, regardless of odds (see bet_repository.py
// _persist) — this mirrors that, so the preview shown before placing a bet matches what the
// server will actually credit.
function potentialWinnings(stakeRaw: string): string | null {
  const stake = Number(stakeRaw);
  if (!Number.isFinite(stake) || stake <= 0) return null;
  return stake.toFixed(2);
}

function StakeInfoRow({ stakeValue }: { stakeValue: string }) {
  const stake = Number(stakeValue);
  const hasStake = Number.isFinite(stake) && stake > 0;
  return (
    <View style={styles.stakeInfoRow}>
      <View style={styles.stakeInfoItem}>
        <Text style={styles.stakeInfoLabel}>Apuestas</Text>
        <View style={styles.stakeInfoValueRow}>
          <Text style={styles.stakeInfoValue}>{hasStake ? stakeValue : "—"}</Text>
          <BethsIcon size={12} color={colors.muted} />
        </View>
      </View>
      <View style={styles.stakeInfoItem}>
        <Text style={styles.stakeInfoLabel}>Si aciertas cobras</Text>
        <View style={styles.stakeInfoValueRow}>
          <Text style={styles.stakeInfoValue}>{potentialWinnings(stakeValue) ?? "—"}</Text>
          <BethsIcon size={12} color={colors.accent} />
        </View>
      </View>
    </View>
  );
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

// A handful of concrete, tappable Elo targets (see eloPreview.curatedEloOptions) instead of a
// +/- stepper the player had to walk one step at a time to reach a far-off value. Auto-picks
// the lowest option the first time there's nothing selected yet, so there's always a valid
// value showing instead of an empty state.
function EloOptionGrid({ options, selectedStake, onPick }: { options: QuickStakeOption[]; selectedStake: string; onPick: (stake: number) => void }) {
  const selected = Number(selectedStake);
  const hasSelection = options.some((o) => o.stake === selected);

  useEffect(() => {
    if (!hasSelection && options.length > 0) {
      onPick(options[0].stake);
    }
  }, [hasSelection, options]);

  if (options.length === 0) {
    return <Text style={styles.eloRangeText}>No tienes Beths suficientes para apostar.</Text>;
  }

  return (
    <View style={styles.eloChipGrid}>
      {options.map((option) => {
        const isSelected = option.stake === selected;
        return (
          <Pressable
            key={`${option.deltaIfWin}-${option.stake}`}
            style={[styles.eloChip, isSelected ? styles.eloChipSelected : null]}
            onPress={() => onPick(option.stake)}
          >
            <Text style={[styles.eloChipValue, isSelected ? styles.eloChipValueSelected : null]}>+{option.deltaIfWin} Elo</Text>
            <Text style={[styles.eloChipSubtext, isSelected ? styles.eloChipSubtextSelected : null]}>{option.stake} B</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type TicketRowProps = {
  selection: Selection;
  activeTab: BetSlipTab;
  stakeValue: string;
  onPickStake: (stake: number) => void;
  onRemove: () => void;
  eloPreview: EloPreview | null;
  eloCountsToday: boolean;
  eloOptions: QuickStakeOption[];
};

// Owns its own exit animation so removing a selection visibly fades/slides it
// away instead of just vanishing from the list; the real removal only happens
// once the animation finishes.
function TicketRow({ selection, activeTab, stakeValue, onPickStake, onRemove, eloPreview, eloCountsToday, eloOptions }: TicketRowProps) {
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
          <Text style={styles.eloGridLabel}>Elige cuánto Elo quieres ganar</Text>
          <EloOptionGrid options={eloOptions} selectedStake={stakeValue} onPick={onPickStake} />
          <StakeInfoRow stakeValue={stakeValue} />
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
    eloOptions,
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
          {selections.length >= 3 ? " Al confirmar, esta combinada puede desbloquear un Elo Boost de hasta el 20% sobre la cuota." : ""}
        </Text>
      ) : null}

      <View style={styles.selectionsBox}>
        {selections.map((selection) => (
          <TicketRow
            key={selection.matchId}
            selection={selection}
            activeTab={activeTab}
            stakeValue={stakes[selection.matchId] ?? ""}
            onPickStake={(stake) => setStake(selection.matchId, String(stake))}
            onRemove={() => removeSelection(selection.matchId)}
            eloPreview={eloPreview(selection.odds, stakes[selection.matchId] ?? "")}
            eloCountsToday={eloRemainingToday > 0}
            eloOptions={eloOptions(selection.odds)}
          />
        ))}
      </View>

      {activeTab === "combinada" && combinedOdds !== null ? (
        <View style={styles.combinadaBox}>
          <View style={styles.combinadaRow}>
            <Text style={styles.stubText}>Cuota combinada</Text>
            <Text style={styles.ticketOdds}>{formatOdds(combinedOdds)}</Text>
          </View>
          <Text style={styles.eloGridLabel}>Elige cuánto Elo quieres ganar</Text>
          <EloOptionGrid
            options={eloOptions(combinedOdds)}
            selectedStake={combinadaStake}
            onPick={(stake) => setCombinadaStake(String(stake))}
          />
          <StakeInfoRow stakeValue={combinadaStake} />
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
  eloGridLabel: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    fontWeight: "700",
    marginTop: 8,
  },
  eloRangeText: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    marginTop: 4,
  },
  eloChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 6,
  },
  eloChip: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    paddingVertical: 10,
  },
  eloChipSelected: {
    borderColor: colors.primary,
    ...shadows.selected,
  },
  eloChipValue: {
    color: colors.text,
    fontWeight: "900",
    fontSize: fontSizes.md,
  },
  eloChipValueSelected: {
    color: colors.primary,
  },
  eloChipSubtext: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    fontWeight: "700",
    marginTop: 1,
  },
  eloChipSubtextSelected: {
    color: colors.accent,
  },
  stakeInfoRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 8,
  },
  stakeInfoItem: {
    flex: 1,
  },
  stakeInfoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  stakeInfoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  stakeInfoValue: {
    color: colors.text,
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
