import { requestJson } from "./auth";

export type ActivityKind = "milestone" | "challenge_won" | "bet_won" | "prediction_resolved";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  isSelf: boolean;
  title: string;
  detail: string | null;
  occurredAt: string;
  accountId: string;
  displayName: string;
  avatarUrl: string;
};

export async function fetchActivityFeed(): Promise<ActivityEvent[]> {
  const payload = await requestJson<{ activity: ActivityEvent[] }>("/activity");
  return payload.activity;
}
