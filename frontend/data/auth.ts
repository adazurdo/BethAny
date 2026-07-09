export type AccountProfile = {
  displayName: string;
  avatarUrl: string;
  elo: number;
  rankLabel: string;
  winRate: string;
  streak: string;
  bio: string;
};

export type BetSelection = {
  id: string;
  title: string;
  meta?: string;
  status?: string;
};

export type FriendItem = {
  id: string;
  name: string;
  avatarUrl: string;
  sportFocus: string;
  status: string;
  isSelected: boolean;
};

export type AuthAccount = {
  accountId: string;
  identifier: string;
  status: string;
  createdAt: string;
  lastLoginAt: string;
  profile: AccountProfile;
  bets: BetSelection[];
  friends: FriendItem[];
};

export type AuthCredentials = {
  identifier: string;
  password: string;
  displayName?: string;
};

export type AccountStateUpdate = {
  profile?: AccountProfile;
  bets?: BetSelection[];
  friends?: FriendItem[];
};

const API_URL = process.env.EXPO_PUBLIC_BETHANY_API_URL ?? "http://127.0.0.1:8000";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : {};

  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export function getApiUrl() {
  return API_URL;
}

export async function registerAccount(credentials: AuthCredentials) {
  return requestJson<AuthAccount>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function loginAccount(credentials: AuthCredentials) {
  return requestJson<AuthAccount>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function logoutAccount() {
  return requestJson<{ ok: true }>("/auth/logout", {
    method: "POST",
  });
}

export async function loadCurrentAccount() {
  return requestJson<AuthAccount>("/account/me");
}

export async function saveCurrentAccount(update: AccountStateUpdate) {
  return requestJson<AuthAccount>("/account/me", {
    method: "PUT",
    body: JSON.stringify(update),
  });
}