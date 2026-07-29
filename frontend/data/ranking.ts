import { requestJson } from "./auth";

export type GlobalRankingEntry = {
  accountId: string;
  position: number;
  displayName: string;
  avatarUrl: string;
  elo: number;
  rankLabel: string;
  provisional: boolean;
};

export async function fetchGlobalRanking(): Promise<GlobalRankingEntry[]> {
  const payload = await requestJson<{ ranking: GlobalRankingEntry[] }>("/ranking");
  return payload.ranking;
}
