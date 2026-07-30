import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { PlacedBet } from "../data/bets";
import { useAuth } from "./AuthContext";
import { StreakCelebrationModal, StreakKind } from "./StreakCelebrationModal";

const STREAK_THRESHOLD = 4;

type SettledStatus = "ganada" | "perdida";

type StreakContextValue = {
  // Feeds real settled bets (e.g. from "Mis apuestas") into the streak detector.
  reportBets: (bets: PlacedBet[]) => void;
  // Provisional hook for the "Racha win" / "Racha loose" debug buttons.
  triggerTestStreak: (kind: StreakKind) => void;
};

const StreakContext = createContext<StreakContextValue | undefined>(undefined);

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error("useStreak must be used within StreakProvider");
  return ctx;
}

function betTimestamp(bet: PlacedBet): number {
  return new Date(bet.settledAt ?? bet.createdAt).getTime();
}

function currentStreak(bets: PlacedBet[]): { kind: SettledStatus; count: number } | null {
  const settled = bets
    .filter((bet): bet is PlacedBet & { status: SettledStatus } => bet.status === "ganada" || bet.status === "perdida")
    .slice()
    .sort((a, b) => betTimestamp(b) - betTimestamp(a));

  if (settled.length === 0) return null;

  const kind = settled[0].status;
  let count = 0;
  for (const bet of settled) {
    if (bet.status !== kind) break;
    count += 1;
  }
  return { kind, count };
}

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const [popup, setPopup] = useState<StreakKind | null>(null);
  // Remembers the last streak length we already celebrated for this account/kind so
  // re-fetching the same bets (e.g. re-visiting "Mis apuestas") doesn't re-fire the popup.
  const lastCelebrated = useRef<{ accountId?: string; kind: SettledStatus; count: number } | null>(null);

  const reportBets = useCallback(
    (bets: PlacedBet[]) => {
      const streak = currentStreak(bets);
      if (!streak || streak.count < STREAK_THRESHOLD || streak.count % STREAK_THRESHOLD !== 0) return;

      const accountId = account?.accountId;
      const last = lastCelebrated.current;
      if (last && last.accountId === accountId && last.kind === streak.kind && last.count === streak.count) {
        return;
      }
      lastCelebrated.current = { accountId, kind: streak.kind, count: streak.count };
      setPopup(streak.kind === "ganada" ? "win" : "loss");
    },
    [account?.accountId]
  );

  const triggerTestStreak = useCallback((kind: StreakKind) => {
    setPopup(kind);
  }, []);

  const value = useMemo<StreakContextValue>(() => ({ reportBets, triggerTestStreak }), [reportBets, triggerTestStreak]);

  return (
    <StreakContext.Provider value={value}>
      {children}
      <StreakCelebrationModal kind={popup} onClose={() => setPopup(null)} />
    </StreakContext.Provider>
  );
}
