import { Platform } from "react-native";

export type AccountProfile = {
  displayName: string;
  avatarUrl: string;
  elo: number;
  beths: number;
  bethsLastGrantAt: string;
  rankLabel: string;
  winRate: string;
  streak: string;
  bio: string;
  eloBetsSettled: number;
  eloBetsCountedToday: number;
  eloBetsCountedDate: string;
};

export type EloMilestoneAward = {
  tier: number;
  bonusBeths: number;
  awardedAt: string;
};

export type BetSelection = {
  id: string;
  title: string;
  meta?: string;
  status?: string;
  matchId?: string;
  outcome?: "local" | "empate" | "visitante";
  odds?: number;
  stake?: number;
};

export type AuthAccount = {
  accountId: string;
  identifier: string;
  status: string;
  createdAt: string;
  lastLoginAt: string;
  profile: AccountProfile;
  bets: BetSelection[];
  unseenEloMilestones: EloMilestoneAward[];
};

type AuthResponse = AuthAccount & { sessionToken: string };

// Per-tab/per-app-instance session token, kept in memory only (matches the app's existing
// "log in again after a reload" behavior — see AuthContext, which never restores `account`
// on mount either). The backend used to track a single global "active account" instead of a
// token per login, so logging in from a second device silently hijacked every other device's
// session — exactly the scenario the friends feature needs to test, since it requires two
// real accounts logged in at once. This token is what fixes that.
let sessionToken: string | null = null;

export type AuthCredentials = {
  identifier: string;
  password: string;
  displayName?: string;
};

export type AccountStateUpdate = {
  profile?: AccountProfile;
  bets?: BetSelection[];
};

function resolveApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_BETHANY_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return "http://localhost:8000";
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }

  return "http://127.0.0.1:8000";
}

const API_URL = resolveApiUrl();

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new Error(`No se pudo conectar con la API local en ${API_URL}. Verifica que el backend esté en ejecución.`);
  }

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
  const response = await requestJson<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  sessionToken = response.sessionToken;
  return response;
}

export async function loginAccount(credentials: AuthCredentials) {
  const response = await requestJson<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  sessionToken = response.sessionToken;
  return response;
}

export async function logoutAccount() {
  try {
    return await requestJson<{ ok: true }>("/auth/logout", {
      method: "POST",
    });
  } finally {
    sessionToken = null;
  }
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

export async function ackEloMilestones() {
  return requestJson<{ ok: true }>("/account/me/milestones/ack", {
    method: "POST",
  });
}