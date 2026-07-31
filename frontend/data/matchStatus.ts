// Mirrors backend/bethany_mock/odds.py's OPEN_FOR_BETTING_STATUSES: football-data.org's
// "scheduled"/"timed" and PandaScore's "not_started" all mean "not yet played" - still open to
// bet on, challenge a friend on, or feature on the home screen. Kept in one place after the
// same status set drifted out of sync three times across the frontend (EventCard, the home
// screen's featured matches, and the retos match picker each redefined it separately, and only
// the football statuses ever made it into two of them - hiding every esports match there).
const OPEN_MATCH_STATUSES = new Set(["scheduled", "timed", "not_started"]);

export function isMatchOpen(status: string): boolean {
  return OPEN_MATCH_STATUSES.has(status.toLowerCase());
}

// football-data.org's "in_play"/"paused"/"suspended" and PandaScore's "running" all mean the
// match is actually being played right now (as opposed to "postponed", which is also not open
// for betting but isn't live - just delayed).
const LIVE_MATCH_STATUSES = new Set(["in_play", "paused", "suspended", "running"]);

export function isMatchLive(status: string): boolean {
  return LIVE_MATCH_STATUSES.has(status.toLowerCase());
}
