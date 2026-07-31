import { requestJson } from "./auth";

export type BetOutcome = "local" | "empate" | "visitante";

export type PlacedBetSelection = {
  matchId: string;
  matchLabel: string;
  outcome: BetOutcome;
  odds: number;
  result: BetOutcome | null;
  won: boolean | null;
  // Only populated while the bet is still pending (null once settled, or if the match already
  // dropped out of its competition's synced snapshot).
  matchStatus: string | null;
};

export type PlacedBet = {
  id: string;
  betType: "simple" | "combinada";
  stake: number;
  combinedOdds: number;
  potentialWinnings: number;
  status: string;
  createdAt: string;
  settledAt: string | null;
  selections: PlacedBetSelection[];
};

type SimpleSelectionInput = { matchId: string; outcome: BetOutcome; stake: number };
type CombinadaSelectionInput = { matchId: string; outcome: BetOutcome };

export async function placeSimpleBets(selections: SimpleSelectionInput[]): Promise<PlacedBet[]> {
  const payload = await requestJson<{ placedBets: PlacedBet[] }>("/bets/place", {
    method: "POST",
    body: JSON.stringify({ betType: "simple", selections }),
  });
  return payload.placedBets;
}

export async function placeCombinadaBet(selections: CombinadaSelectionInput[], stake: number): Promise<PlacedBet[]> {
  const payload = await requestJson<{ placedBets: PlacedBet[] }>("/bets/place", {
    method: "POST",
    body: JSON.stringify({ betType: "combinada", stake, selections }),
  });
  return payload.placedBets;
}

export async function fetchMyBets(): Promise<PlacedBet[]> {
  const payload = await requestJson<{ bets: PlacedBet[] }>("/bets/mine");
  return payload.bets;
}
