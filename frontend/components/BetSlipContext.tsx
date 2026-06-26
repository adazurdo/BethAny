import React, { createContext, useContext, useState } from "react";

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

  function addSelection(s: Selection) {
    setSelections((prev) => {
      if (prev.find((p) => p.id === s.id)) return prev;
      return [...prev, s];
    });
  }

  function removeSelection(id: string) {
    setSelections((prev) => prev.filter((p) => p.id !== id));
  }

  function clear() {
    setSelections([]);
  }

  return (
    <BetSlipContext.Provider value={{ selections, addSelection, removeSelection, clear }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export type { Selection };
