import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import type { BetSelection } from "../data/auth";
import { BetOutcome, placeCombinadaBet, placeSimpleBets } from "../data/bets";

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
  setActiveTab: (tab: BetSlipTab) => void;
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
};

const OUTCOMES: BetOutcome[] = ["local", "empate", "visitante"];

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
  const { account, updateAccount } = useAuth();

  useEffect(() => {
    const restored = ((account?.bets as BetSelection[] | undefined) ?? [])
      .filter(isBetSelection)
      .map((bet) => ({ id: bet.matchId, title: bet.title, meta: bet.meta, matchId: bet.matchId, outcome: bet.outcome, odds: bet.odds }));
    setSelections(restored);
  }, [account?.accountId]);

  // The Combinada tab only exists with 2+ selections from different matches; drop back to Simple otherwise.
  useEffect(() => {
    if (selections.length < 2 && activeTab === "combinada") {
      setActiveTabState("simple");
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

  function setActiveTab(tab: BetSlipTab) {
    if (tab === "combinada" && selections.length < 2) return;
    setActiveTabState(tab);
  }

  const canCombine = selections.length >= 2;

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
      setPlaceError("Introduce un importe válido para cada selección.");
      return false;
    }
    setPlacing(true);
    try {
      await placeSimpleBets(parsedSelections);
      clear();
      return true;
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : "No se pudo realizar la apuesta.");
      return false;
    } finally {
      setPlacing(false);
    }
  }

  async function placeCombinada(): Promise<boolean> {
    setPlaceError(null);
    const stake = Number(combinadaStake);
    if (!Number.isFinite(stake) || stake <= 0) {
      setPlaceError("Introduce un importe válido para la combinada.");
      return false;
    }
    if (selections.length < 2) {
      setPlaceError("Necesitas al menos dos selecciones de partidos distintos.");
      return false;
    }
    setPlacing(true);
    try {
      await placeCombinadaBet(
        selections.map((s) => ({ matchId: s.matchId, outcome: s.outcome })),
        stake
      );
      clear();
      return true;
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : "No se pudo realizar la apuesta.");
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
        setActiveTab,
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
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export type { Selection, BetSlipTab };
