// Cosmetic Elo "league" tiers — a pure, client-only bucketing of the Elo number the backend
// already returns, no new endpoint or stored field needed. Kept deliberately lightweight
// (see the "ligas por Elo" conversation): a badge, not a real league with its own
// leaderboard/promotion — this repo's account base is small enough that a real per-league
// table would mostly show empty leagues. If that changes, `tierForElo` is the one place a
// future real-league feature would read from.
import { colors } from "../theme";

export type EloTier = {
  name: string;
  minElo: number;
  color: string;
};

export const ELO_TIERS: EloTier[] = [
  { name: "Bronce", minElo: 100, color: colors.sky },
  { name: "Plata", minElo: 1000, color: colors.teal },
  { name: "Oro", minElo: 1400, color: colors.gold },
  { name: "Platino", minElo: 1700, color: colors.primary },
  { name: "Diamante", minElo: 2000, color: colors.pink },
  { name: "Maestro", minElo: 2300, color: colors.coral },
];

export function tierForElo(elo: number): EloTier {
  let current = ELO_TIERS[0];
  for (const tier of ELO_TIERS) {
    if (elo >= tier.minElo) {
      current = tier;
    }
  }
  return current;
}
