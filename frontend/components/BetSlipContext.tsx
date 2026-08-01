import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import type { BetSelection } from "../data/auth";
import { BetOutcome, PlacedBet, placeCombinadaBet, placeSimpleBets } from "../data/bets";
import { curatedEloOptions, eloBetsRemainingToday, EloPreview, MAX_ELO_STAKE, previewEloDelta, QuickStakeOption } from "../data/eloPreview";
import { EloBoostRevealModal } from "./EloBoostRevealModal";

type Selection = {
  id: string;
  title: string;
  meta?: string;
  matchId: string;
  outcome: BetOutcome;
  odds: number;
};

type BetSlipTab = "simple" | "combinada";

type NewSelectionInput = {
  matchId: string;
  title: string;
  meta?: string;
  outcome: BetOutcome;
  odds: number;
};

type BetSlipContextValue = {
  selections: Selection[];
  activeTab: BetSlipTab;
  canCombine: boolean;
  addSelection: (s: NewSelectionInput) => void;
  removeSelection: (matchId: string) => void;
  clear: () => void;
  isSelected: (matchId: string, outcome: BetOutcome) => boolean;
  stakes: Record<string, string>;
  setStake: (matchId: string, value: string) => void;
  combinadaStake: string;
  setCombinadaStake: (value: string) => void;
  combinedOdds: number | null;
  placing: boolean;
  placeError: string | null;
  placeSimple: () => Promise<boolean>;
  placeCombinada: () => Promise<boolean>;
  eloPreview: (odds: number, stakeRaw: string) => EloPreview | null;
  eloRemainingToday: number;
  // A handful of concrete Elo-on-win picks (Conservador/Equilibrado/Arriesgado/Máximo) spread
  // across the full range actually reachable with the account's current Beths for a given
  // odds - the bet slip only offers these as buttons, it never lets the player type a Beths
  // amount (or an Elo target) freely.
  eloOptions: (odds: number) => QuickStakeOption[];
};

const OUTCOMES: BetOutcome[] = ["local", "empate", "visitante"];

function describePlaceError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message === "insufficient beths balance") {
    return "No tienes Beths suficientes para esta apuesta.";
  }
  return message || "No se pudo realizar la apuesta.";
}

const BetSlipContext = createContext<BetSlipContextValue | undefined>(undefined);

export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used within BetSlipProvider");
  return ctx;
}

function isBetSelection(bet: BetSelection): bet is BetSelection & { matchId: string; outcome: BetOutcome; odds: number } {
  return Boolean(bet.matchId && bet.outcome && OUTCOMES.includes(bet.outcome) && typeof bet.odds === "number");
}

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [activeTab, setActiveTabState] = useState<BetSlipTab>("simple");
  const [stakes, setStakes] = useState<Record<string, string>>({});
  const [combinadaStake, setCombinadaStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  // Set once a just-placed combinada came back with an Elo boost, so EloBoostRevealModal can
  // animate/reveal it. The bet is already confirmed and non-editable by this point (FR: the
  // boost only ever shows after confirmation).
  const [boostReveal, setBoostReveal] = useState<PlacedBet | null>(null);
  const { account, updateAccount } = useAuth();

  useEffect(() => {
    const restored = ((account?.bets as BetSelection[] | undefined) ?? [])
      .filter(isBetSelection)
      .map((bet) => ({ id: bet.matchId, title: bet.title, meta: bet.meta, matchId: bet.matchId, outcome: bet.outcome, odds: bet.odds }));
    setSelections(restored);
  }, [account?.accountId]);

  // With 2+ selections the boleto can only be placed as a combinada (bet on the
  // total, not on each leg); with fewer than 2 it can only be Simple.
  useEffect(() => {
    const forced: BetSlipTab = selections.length >= 2 ? "combinada" : "simple";
    if (activeTab !== forced) {
      setActiveTabState(forced);
    }
  }, [selections.length, activeTab]);

  async function syncSelections(nextSelections: Selection[]) {
    setSelections(nextSelections);
    if (!account) {
      return;
    }
    const asBetSelections: BetSelection[] = nextSelections.map((s) => ({
      id: s.id,
      title: s.title,
      meta: s.meta,
      matchId: s.matchId,
      outcome: s.outcome,
      odds: s.odds,
    }));
    await updateAccount({ bets: asBetSelections });
  }

  const addSelection = useCallback((s: NewSelectionInput) => {
    setSelections((prev) => {
      const existing = prev.find((p) => p.matchId === s.matchId);
      let next: Selection[];
      if (existing && existing.outcome === s.outcome) {
        // Tapping the same outcome again removes the selection (FR-005).
        next = prev.filter((p) => p.matchId !== s.matchId);
      } else {
        // At most one active selection per match; a different outcome replaces it (FR-004).
        const withoutMatch = prev.filter((p) => p.matchId !== s.matchId);
        next = [...withoutMatch, { id: s.matchId, title: s.title, meta: s.meta, matchId: s.matchId, outcome: s.outcome, odds: s.odds }];
      }
      void syncSelections(next);
      return next;
    });
    setPlaceError(null);
  }, [account?.accountId]);

  const removeSelection = useCallback((matchId: string) => {
    setSelections((prev) => {
      const next = prev.filter((p) => p.matchId !== matchId);
      void syncSelections(next);
      return next;
    });
    setStakes((prev) => {
      const { [matchId]: _removed, ...rest } = prev;
      return rest;
    });
  }, [account?.accountId]);

  function clear() {
    void syncSelections([]);
    setStakes({});
    setCombinadaStake("");
    setActiveTabState("simple");
    setPlaceError(null);
  }

  function isSelected(matchId: string, outcome: BetOutcome) {
    return selections.some((s) => s.matchId === matchId && s.outcome === outcome);
  }

  function setStake(matchId: string, value: string) {
    setStakes((prev) => ({ ...prev, [matchId]: value }));
  }

  const maxAvailableBeths = Math.min(account?.profile.beths ?? 0, MAX_ELO_STAKE);

  const canCombine = selections.length >= 2;

  const eloRemainingToday = useMemo(() => {
    const profile = account?.profile;
    if (!profile) return 0;
    return eloBetsRemainingToday(profile.eloBetsCountedToday, profile.eloBetsCountedDate);
  }, [account?.profile.eloBetsCountedToday, account?.profile.eloBetsCountedDate]);

  const eloPreview = useCallback(
    (odds: number, stakeRaw: string): EloPreview | null => {
      const profile = account?.profile;
      const stake = Number(stakeRaw);
      if (!profile || !Number.isFinite(stake) || stake <= 0) return null;
      return previewEloDelta(profile.elo, profile.eloBetsSettled, odds, stake);
    },
    [account?.profile.elo, account?.profile.eloBetsSettled]
  );

  const getEloOptions = useCallback(
    (odds: number): QuickStakeOption[] => {
      const profile = account?.profile;
      if (!profile) return [];
      return curatedEloOptions(profile.eloBetsSettled, odds, maxAvailableBeths);
    },
    [account?.profile.eloBetsSettled, maxAvailableBeths]
  );

  const combinedOdds = useMemo(() => {
    if (selections.length < 2) return null;
    // Combined odds are the sum of every leg's odds (not the product).
    return selections.reduce((acc, s) => acc + s.odds, 0);
  }, [selections]);

  async function placeSimple(): Promise<boolean> {
    setPlaceError(null);
    const parsedSelections = selections.map((s) => {
      const raw = stakes[s.matchId];
      const stake = Number(raw);
      return { matchId: s.matchId, outcome: s.outcome, stake };
    });
    if (parsedSelections.some((s) => !Number.isFinite(s.stake) || s.stake <= 0)) {
      setPlaceError("Elige cuánto Elo quieres ganar en cada selección.");
      return false;
    }
    setPlacing(true);
    try {
      await placeSimpleBets(parsedSelections);
      clear();
      return true;
    } catch (err) {
      setPlaceError(describePlaceError(err));
      return false;
    } finally {
      setPlacing(false);
    }
  }

  async function placeCombinada(): Promise<boolean> {
    setPlaceError(null);
    const stake = Number(combinadaStake);
    if (!Number.isFinite(stake) || stake <= 0) {
      setPlaceError("Elige cuánto Elo quieres ganar con la combinada.");
      return false;
    }
    if (selections.length < 2) {
      setPlaceError("Necesitas al menos dos selecciones de partidos distintos.");
      return false;
    }
    setPlacing(true);
    try {
      const placedBets = await placeCombinadaBet(
        selections.map((s) => ({ matchId: s.matchId, outcome: s.outcome })),
        stake
      );
      clear();
      const placed = placedBets[0];
      if (placed && placed.eloBoostPercent != null) {
        setBoostReveal(placed);
      }
      return true;
    } catch (err) {
      setPlaceError(describePlaceError(err));
      return false;
    } finally {
      setPlacing(false);
    }
  }

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        activeTab,
        canCombine,
        addSelection,
        removeSelection,
        clear,
        isSelected,
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
        eloOptions: getEloOptions,
      }}
    >
      {children}
      <EloBoostRevealModal bet={boostReveal} onClose={() => setBoostReveal(null)} />
    </BetSlipContext.Provider>
  );
}

export type { Selection, BetSlipTab };
