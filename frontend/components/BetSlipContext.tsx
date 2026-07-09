import React, { createContext, useEffect, useContext, useState } from "react";
import { useAuth } from "./AuthContext";
import type { BetSelection } from "../data/auth";

type Selection = {
  id: string;
  title: string;
  meta?: string;
};

type BetSlipContextValue = {
  selections: Selection[];
  addSelection: (s: Selection) => void;
  removeSelection: (id: string) => void;
  clear: () => void;
};

const BetSlipContext = createContext<BetSlipContextValue | undefined>(undefined);

export function useBetSlip() {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error("useBetSlip must be used within BetSlipProvider");
  return ctx;
}

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const { account, updateAccount } = useAuth();

  useEffect(() => {
    setSelections((account?.bets as Selection[] | undefined) ?? []);
  }, [account?.accountId]);

  async function syncSelections(nextSelections: Selection[]) {
    setSelections(nextSelections);
    if (!account) {
      return;
    }
    await updateAccount({ bets: nextSelections as BetSelection[] });
  }

  function addSelection(s: Selection) {
    setSelections((prev) => {
      if (prev.find((p) => p.id === s.id)) return prev;
      const next = [...prev, s];
      void syncSelections(next);
      return next;
    });
  }

  function removeSelection(id: string) {
    setSelections((prev) => {
      const next = prev.filter((p) => p.id !== id);
      void syncSelections(next);
      return next;
    });
  }

  function clear() {
    void syncSelections([]);
  }

  return (
    <BetSlipContext.Provider value={{ selections, addSelection, removeSelection, clear }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export type { Selection };
