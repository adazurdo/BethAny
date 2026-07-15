import { requestJson } from "./auth";

export type CompetitionSyncStatus = "never_synced" | "synced" | "stale" | "error";

export type CompetitionSource = {
  code: string;
  externalCode: string;
  displayName: string;
  sport: string;
  syncStatus: CompetitionSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type MockTeam = {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string;
  venue: string;
  squad: string[];
  standingPosition: number | null;
};

export type MockCompetitionMatch = {
  id: string;
  competitionCode: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  kickoffLabel: string;
  status: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
};

export type CompetitionMatchesResult = {
  source: CompetitionSource;
  teams: MockTeam[];
  matches: MockCompetitionMatch[];
};

export type CompetitionSyncResult = {
  ok: boolean;
  source: CompetitionSource | null;
  teams: MockTeam[];
  matches: MockCompetitionMatch[];
  error?: string;
};

type RawCompetitionSource = {
  code: string;
  external_code: string;
  display_name: string;
  sport: string;
  sync_status: CompetitionSyncStatus;
  last_synced_at: string | null;
  last_error: string | null;
};

type RawMockTeam = {
  id: string;
  name: string;
  short_name: string;
  crest_url: string;
  venue: string;
  squad: string[];
  standing_position: number | null;
};

type RawMockMatch = {
  id: string;
  competition_code: string;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  kickoff_label: string;
  status: string;
  home_odds: number;
  draw_odds: number;
  away_odds: number;
};

type RawSnapshot = {
  teams: RawMockTeam[];
  matches: RawMockMatch[];
} | null;

function toCompetitionSource(raw: RawCompetitionSource): CompetitionSource {
  return {
    code: raw.code,
    externalCode: raw.external_code,
    displayName: raw.display_name,
    sport: raw.sport,
    syncStatus: raw.sync_status,
    lastSyncedAt: raw.last_synced_at,
    lastError: raw.last_error,
  };
}

function toMockTeam(raw: RawMockTeam): MockTeam {
  return {
    id: raw.id,
    name: raw.name,
    shortName: raw.short_name,
    crestUrl: raw.crest_url,
    venue: raw.venue,
    squad: raw.squad ?? [],
    standingPosition: raw.standing_position,
  };
}

function toMockMatch(raw: RawMockMatch): MockCompetitionMatch {
  return {
    id: raw.id,
    competitionCode: raw.competition_code,
    homeTeamId: raw.home_team_id,
    homeTeamName: raw.home_team_name,
    awayTeamId: raw.away_team_id,
    awayTeamName: raw.away_team_name,
    kickoffLabel: raw.kickoff_label,
    status: raw.status,
    homeOdds: raw.home_odds,
    drawOdds: raw.draw_odds,
    awayOdds: raw.away_odds,
  };
}

export async function fetchMockCompetitions(): Promise<CompetitionSource[]> {
  const payload = await requestJson<{ competitions: RawCompetitionSource[] }>("/mock/competitions");
  return payload.competitions.map(toCompetitionSource);
}

export async function fetchMockCompetitionMatches(code: string): Promise<CompetitionMatchesResult> {
  const payload = await requestJson<{ source: RawCompetitionSource; teams: RawMockTeam[]; matches: RawMockMatch[] }>(
    `/mock/competitions/${encodeURIComponent(code)}/matches`
  );
  return {
    source: toCompetitionSource(payload.source),
    teams: payload.teams.map(toMockTeam),
    matches: payload.matches.map(toMockMatch),
  };
}

export async function syncMockCompetition(code: string): Promise<CompetitionSyncResult> {
  const payload = await requestJson<{ ok: boolean; source: RawCompetitionSource | null; snapshot: RawSnapshot; error?: string }>(
    `/mock/competitions/${encodeURIComponent(code)}/sync`,
    { method: "POST" }
  );
  return {
    ok: payload.ok,
    source: payload.source ? toCompetitionSource(payload.source) : null,
    teams: payload.snapshot ? payload.snapshot.teams.map(toMockTeam) : [],
    matches: payload.snapshot ? payload.snapshot.matches.map(toMockMatch) : [],
    error: payload.error,
  };
}
