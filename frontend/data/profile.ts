import { requestJson } from "./auth";
import { AccountRelationship } from "./social";

export type AccountProfile = {
  accountId: string;
  identifier: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  elo: number;
  rankLabel: string;
  winRate: string;
  streak: string;
  relationship: AccountRelationship | "self";
  headToHead: { wins: number; losses: number };
};

export async function fetchAccountProfile(accountId: string): Promise<AccountProfile> {
  return requestJson<AccountProfile>(`/accounts/${encodeURIComponent(accountId)}/profile`);
}
