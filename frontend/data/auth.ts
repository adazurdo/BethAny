import { Platform } from "react-native";

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