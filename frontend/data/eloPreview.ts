// Pure client-side mirror of backend/bethany_mock/elo.py, so the bet slip can preview a
// bet's Elo impact live as the user types a stake, without a network round trip per
// keystroke. Constants must stay in sync with elo.py (see specs/006-elo/research.md).

const K_FACTOR_NEW = 32;
const K_FACTOR_ESTABLISHED = 16;
const K_FACTOR_VETERAN = 8;
const K_FACTOR_THRESHOLD_ESTABLISHED = 30;
const K_FACTOR_THRESHOLD_VETERAN = 200;

const ELO_FLOOR = 100;

const P_IMPLIED_MIN = 0.05;
const P_IMPLIED_MAX = 0.95;

const STAKE_MULT_MIN = 0.2;
const STAKE_MULT_MAX = 5.0;

export const MAX_ELO_STAKE = 100;
export const DAILY_ELO_COUNTED_BETS = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < K_FACTOR_THRESHOLD_ESTABLISHED) return K_FACTOR_NEW;
  if (gamesPlayed < K_FACTOR_THRESHOLD_VETERAN) return K_FACTOR_ESTABLISHED;
  return K_FACTOR_VETERAN;
}

function impliedProbability(odds: number): number {
  const raw = odds > 0 ? 1 / odds : 0.5;
  return clamp(raw, P_IMPLIED_MIN, P_IMPLIED_MAX);
}

function stakeMultiplier(stake: number): number {
  if (stake <= 0) return STAKE_MULT_MIN;
  const raw = STAKE_MULT_MIN + (STAKE_MULT_MAX - STAKE_MULT_MIN) * (stake / MAX_ELO_STAKE);
  return clamp(raw, STAKE_MULT_MIN, STAKE_MULT_MAX);
}

export type EloPreview = {
  deltaIfWin: number;
  deltaIfLose: number;
  eloIfWin: number;
  eloIfLose: number;
};

export function previewEloDelta(currentElo: number, gamesPlayed: number, odds: number, stake: number): EloPreview {
  const cappedStake = Math.min(stake, MAX_ELO_STAKE);
  const k = kFactor(gamesPlayed);
  const p = impliedProbability(odds);
  const m = stakeMultiplier(cappedStake);
  const deltaIfWin = k * m * (1 - p);
  const deltaIfLose = k * m * (0 - p);
  return {
    deltaIfWin: Math.round(deltaIfWin),
    deltaIfLose: Math.round(deltaIfLose),
    eloIfWin: Math.max(ELO_FLOOR, Math.round(currentElo + deltaIfWin)),
    eloIfLose: Math.max(ELO_FLOOR, Math.round(currentElo + deltaIfLose)),
  };
}

// Whether a bet settled "today" (UTC) would still count toward Elo, mirroring
// bet_repository._apply_elo_for_settlement's daily-cap check.
export function eloBetsRemainingToday(countedToday: number, countedDate: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = countedDate === today ? countedToday : 0;
  return Math.max(0, DAILY_ELO_COUNTED_BETS - usedToday);
}

