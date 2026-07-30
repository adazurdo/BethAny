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
  emoji: string;
};

export const ELO_TIERS: EloTier[] = [
  { name: "Noob", minElo: 1300, color: colors.sky, emoji: "🐣" },
  { name: "Coin Flipper", minElo: 1400, color: colors.teal, emoji: "🪙" },
  { name: "Lucky Bettor", minElo: 1500, color: colors.lime, emoji: "🍀" },
  { name: "Odds Chaser", minElo: 1600, color: colors.gold, emoji: "🎯" },
  { name: "Analyst", minElo: 1700, color: colors.coral, emoji: "🧠" },
  { name: "Value Hunter", minElo: 1800, color: colors.accent, emoji: "🔍" },
  { name: "Sharp", minElo: 1900, color: colors.highlight, emoji: "🦈" },
  { name: "Tipster", minElo: 2000, color: colors.primary, emoji: "👑" },
];

// Appends an alpha channel to a 6-digit hex color, e.g. withAlpha(colors.primary, "22") for a
// ~13% tint — used for tier badge/row backgrounds so each rank reads as "its own color" at a
// glance, not just via the text.
export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export function tierForElo(elo: number): EloTier {
  let current = ELO_TIERS[0];
  for (const tier of ELO_TIERS) {
    if (elo >= tier.minElo) {
      current = tier;
    }
  }
  return current;
}

export type TierProgress = {
  tier: EloTier;
  nextTier: EloTier | null;
  eloToNext: number | null;
  // 0-1 share of the way through the current band toward nextTier; 1 (maxed out) once
  // there's no tier left to climb to (Tipster has no ceiling).
  ratio: number;
};

export function tierProgress(elo: number): TierProgress {
  const tier = tierForElo(elo);
  const tierIndex = ELO_TIERS.findIndex((candidate) => candidate.name === tier.name);
  const nextTier = tierIndex >= 0 && tierIndex < ELO_TIERS.length - 1 ? ELO_TIERS[tierIndex + 1] : null;
  if (!nextTier) {
    return { tier, nextTier: null, eloToNext: null, ratio: 1 };
  }
  const eloToNext = Math.max(0, nextTier.minElo - elo);
  const ratio = Math.min(1, Math.max(0, (elo - tier.minElo) / (nextTier.minElo - tier.minElo)));
  return { tier, nextTier, eloToNext, ratio };
}
