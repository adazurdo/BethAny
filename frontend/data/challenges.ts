import { requestJson } from "./auth";
import { BetOutcome } from "./bets";

export type ChallengeStatus = "pending" | "accepted" | "declined" | "cancelled" | "settled";
export type ChallengeType = "match" | "custom";

export type FriendChallenge = {
  id: string;
  challengerAccountId: string;
  challengerDisplayName: string;
  opponentAccountId: string;
  opponentDisplayName: string;
  challengeType: ChallengeType;
  matchId: string | null;
  matchLabel: string | null;
  title: string | null;
  options: string[];
  // For "match" challenges this is a BetOutcome; for "custom" challenges it's whichever
  // option the challenger picked out of `options`.
  outcome: string;
  status: ChallengeStatus;
  createdAt: string;
  respondedAt: string | null;
  settledAt: string | null;
  result: string | null;
  winnerAccountId: string | null;
};

export type ChallengeList = {
  incoming: FriendChallenge[];
  outgoing: FriendChallenge[];
  active: FriendChallenge[];
  resolved: FriendChallenge[];
};

export async function listMyChallenges(): Promise<ChallengeList> {
  return requestJson<ChallengeList>("/challenges/mine");
}

export async function createMatchChallenge(
  opponentAccountId: string,
  matchId: string,
  outcome: BetOutcome
): Promise<FriendChallenge> {
  return requestJson<FriendChallenge>("/challenges", {
    method: "POST",
    body: JSON.stringify({ challengeType: "match", opponentAccountId, matchId, outcome }),
  });
}

export async function createCustomChallenge(
  opponentAccountId: string,
  title: string,
  options: string[],
  outcome: string
): Promise<FriendChallenge> {
  return requestJson<FriendChallenge>("/challenges", {
    method: "POST",
    body: JSON.stringify({ challengeType: "custom", opponentAccountId, title, options, outcome }),
  });
}

export async function acceptChallenge(challengeId: string): Promise<FriendChallenge> {
  return requestJson<FriendChallenge>(`/challenges/${encodeURIComponent(challengeId)}/accept`, {
    method: "POST",
  });
}

export async function declineChallenge(challengeId: string): Promise<FriendChallenge> {
  return requestJson<FriendChallenge>(`/challenges/${encodeURIComponent(challengeId)}/decline`, {
    method: "POST",
  });
}

export async function cancelChallenge(challengeId: string): Promise<FriendChallenge> {
  return requestJson<FriendChallenge>(`/challenges/${encodeURIComponent(challengeId)}/cancel`, {
    method: "POST",
  });
}

export async function resolveCustomChallenge(challengeId: string, result: string): Promise<FriendChallenge> {
  return requestJson<FriendChallenge>(`/challenges/${encodeURIComponent(challengeId)}/resolve`, {
    method: "POST",
    body: JSON.stringify({ result }),
  });
}
