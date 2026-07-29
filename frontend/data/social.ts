import { requestJson } from "./auth";

export type SocialFriend = {
  requestId: string;
  accountId: string;
  displayName: string;
  avatarUrl: string;
  elo: number;
  challengeWins: number;
  challengeLosses: number;
};

export type FriendRequest = {
  id: string;
  accountId: string;
  displayName: string;
  avatarUrl: string;
  elo: number;
};

export type FriendState = {
  friends: SocialFriend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
};

export type GroupSummary = {
  id: string;
  name: string;
  ownerAccountId: string;
  memberCount: number;
  createdAt: string;
  hasUpdate: boolean;
};

export type GroupMember = {
  accountId: string;
  displayName: string;
  elo: number;
};

export type PendingGroupInvite = {
  id: string;
  accountId: string;
  displayName: string;
};

export type IncomingGroupInvite = {
  id: string;
  groupId: string;
  groupName: string;
  inviterAccountId: string;
  inviterDisplayName: string;
  createdAt: string;
};

export type PredictionStatus = "open" | "resolved" | "aborted";

export type CustomPrediction = {
  id: string;
  question: string;
  options: string[];
  createdByAccountId: string;
  createdAt: string;
  closesAt: string;
  status: PredictionStatus;
  resolvedOption: string | null;
  resolvedAt: string | null;
  votes: Record<string, number>;
  totalVotes: number;
  myVote: string | null;
};

export type GroupRankingEntry = {
  accountId: string;
  displayName: string;
  correctCount: number;
  elo: number;
};

export type GroupDetail = {
  id: string;
  name: string;
  ownerAccountId: string;
  createdAt: string;
  members: GroupMember[];
  ranking: GroupRankingEntry[];
  pendingInvites: PendingGroupInvite[];
  predictions: CustomPrediction[];
};

export async function listFriends() {
  return requestJson<FriendState>("/social/friends");
}

export async function sendFriendRequest(identifier: string) {
  return requestJson<FriendState>("/social/friends", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });
}

export async function acceptFriendRequest(requestId: string) {
  return requestJson<FriendState>(`/social/friends/requests/${encodeURIComponent(requestId)}/accept`, {
    method: "POST",
  });
}

export async function rejectFriendRequest(requestId: string) {
  return requestJson<FriendState>(`/social/friends/requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
  });
}

export async function removeFriend(friendAccountId: string) {
  return requestJson<FriendState>(`/social/friends/${encodeURIComponent(friendAccountId)}`, {
    method: "DELETE",
  });
}

export async function listGroups() {
  return requestJson<{ groups: GroupSummary[] }>("/social/groups");
}

export async function listIncomingGroupInvites() {
  return requestJson<{ invites: IncomingGroupInvite[] }>("/social/groups/invites");
}

export async function createGroup(name: string) {
  return requestJson<GroupDetail>("/social/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getGroup(groupId: string) {
  return requestJson<GroupDetail>(`/social/groups/${encodeURIComponent(groupId)}`);
}

export async function inviteGroupMember(groupId: string, friendAccountId: string) {
  return requestJson<GroupDetail>(`/social/groups/${encodeURIComponent(groupId)}/members`, {
    method: "POST",
    body: JSON.stringify({ friendAccountId }),
  });
}

export async function acceptGroupInvite(inviteId: string) {
  return requestJson<GroupDetail>(`/social/groups/invites/${encodeURIComponent(inviteId)}/accept`, {
    method: "POST",
  });
}

export async function rejectGroupInvite(inviteId: string) {
  return requestJson<{ ok: true }>(`/social/groups/invites/${encodeURIComponent(inviteId)}/reject`, {
    method: "POST",
  });
}

export async function proposeCustomPrediction(groupId: string, question: string, options: string[], closesAt: string) {
  return requestJson<GroupDetail>(`/social/groups/${encodeURIComponent(groupId)}/predictions`, {
    method: "POST",
    body: JSON.stringify({ question, options, closesAt }),
  });
}

export async function voteOnPrediction(groupId: string, predictionId: string, option: string) {
  return requestJson<GroupDetail>(
    `/social/groups/${encodeURIComponent(groupId)}/predictions/${encodeURIComponent(predictionId)}/votes`,
    {
      method: "POST",
      body: JSON.stringify({ option }),
    },
  );
}

export async function resolvePrediction(groupId: string, predictionId: string, option: string) {
  return requestJson<GroupDetail>(
    `/social/groups/${encodeURIComponent(groupId)}/predictions/${encodeURIComponent(predictionId)}/resolve`,
    {
      method: "POST",
      body: JSON.stringify({ option }),
    },
  );
}

export async function abortPrediction(groupId: string, predictionId: string) {
  return requestJson<GroupDetail>(
    `/social/groups/${encodeURIComponent(groupId)}/predictions/${encodeURIComponent(predictionId)}/abort`,
    {
      method: "POST",
    },
  );
}
