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

const STAKE_MULT_MIN = 0.5;
const STAKE_MULT_MAX = 2.5;

export const MAX_ELO_STAKE = 1000;
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
  const raw = 0.5 + (2 / 3) * Math.log10(stake);
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

export type QuickStakeOption = {
  stake: number;
  deltaIfWin: number;
};

const MIN_STAKE = 1;

export type EloRange = {
  minElo: number;
  maxElo: number;
};

// The Elo gained on a win only ever spans stakeMultiplier's fixed [0.8, 1.5] range (see
// stakeMultiplier above) - every stake below ~10 already sits at the 0.8 floor, and
// MAX_ELO_STAKE (1000) sits at the 1.5 ceiling. So for a given bet (fixed odds/k), the
// achievable Elo-on-win is bounded regardless of how much the player could stake - `maxBeths`
// only matters insofar as it may cap the stake *below* the point where the ceiling is reached.
export function achievableEloRange(gamesPlayed: number, odds: number, maxBeths: number): EloRange | null {
  if (maxBeths < MIN_STAKE) return null;
  const k = kFactor(gamesPlayed);
  const p = impliedProbability(odds);
  const cappedMax = clamp(maxBeths, MIN_STAKE, MAX_ELO_STAKE);
  const minM = stakeMultiplier(MIN_STAKE);
  const maxM = stakeMultiplier(cappedMax);
  return {
    minElo: Math.round(k * minM * (1 - p)),
    maxElo: Math.round(k * maxM * (1 - p)),
  };
}

export type StakeForTarget = {
  stake: number;
  deltaIfWin: number;
  deltaIfLose: number;
};

// Inverts previewEloDelta: given the Elo the player wants to gain on a win, finds the smallest
// stake (in Beths, the currency actually charged) that achieves it - clamped to what
// stakeMultiplier can produce and to the player's available Beths.
export function stakeForTargetElo(gamesPlayed: number, odds: number, targetEloGain: number, maxBeths: number): StakeForTarget | null {
  if (maxBeths < MIN_STAKE) return null;
  const k = kFactor(gamesPlayed);
  const p = impliedProbability(odds);
  const denom = k * (1 - p);
  const targetMultiplier = clamp(targetEloGain / denom, STAKE_MULT_MIN, STAKE_MULT_MAX);
  const rawStake = Math.pow(10, (targetMultiplier - 0.5) / (2 / 3));
  // Beths is a whole-number currency, so round up to the nearest whole Beth (never a decimal)
  // - this also keeps the displayed stake honest, since the backend rounds to the nearest
  // Beth at debit time either way (see bet_repository._debit_beths).
  const roundedUpStake = Math.ceil(rawStake);
  const stake = clamp(roundedUpStake, MIN_STAKE, Math.min(maxBeths, MAX_ELO_STAKE));
  const m = stakeMultiplier(stake);
  return {
    stake,
    deltaIfWin: Math.round(k * m * (1 - p)),
    deltaIfLose: Math.round(k * m * (0 - p)),
  };
}

// Every distinct Elo-on-win value actually reachable for this bet (odds/k) with the player's
// available Beths, one button per integer from the achievable minimum to the achievable
// maximum. Near either edge several integer targets can resolve to the same achieved Elo (the
// stake needed is capped by MAX_ELO_STAKE or by the player's balance), so consecutive
// duplicates are collapsed into a single option instead of showing two buttons with an
// identical label.
export function allAchievableEloOptions(gamesPlayed: number, odds: number, maxBeths: number): QuickStakeOption[] {
  const range = achievableEloRange(gamesPlayed, odds, maxBeths);
  if (!range) return [];
  const options: QuickStakeOption[] = [];
  for (let target = range.minElo; target <= range.maxElo; target += 1) {
    const result = stakeForTargetElo(gamesPlayed, odds, target, maxBeths);
    if (!result) continue;
    const last = options[options.length - 1];
    if (last && last.deltaIfWin === result.deltaIfWin) continue;
    options.push({ stake: result.stake, deltaIfWin: result.deltaIfWin });
  }
  return options;
}

// A handful of concrete, evenly-spread picks across the full achievable range (see
// allAchievableEloOptions) - e.g. "Conservador/Equilibrado/Arriesgado/Máximo" - so the bet
// slip can show a few tappable buttons instead of a +/- stepper the player has to walk one
// step at a time to reach a far-off value.
export function curatedEloOptions(gamesPlayed: number, odds: number, maxBeths: number, count = 4): QuickStakeOption[] {
  const all = allAchievableEloOptions(gamesPlayed, odds, maxBeths);
  if (all.length <= count) return all;
  const picked: QuickStakeOption[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.round((i * (all.length - 1)) / (count - 1));
    const candidate = all[index];
    if (picked.length === 0 || picked[picked.length - 1].deltaIfWin !== candidate.deltaIfWin) {
      picked.push(candidate);
    }
  }
  return picked;
}
