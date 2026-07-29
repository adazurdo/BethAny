import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AccountStateUpdate,
  AuthAccount,
  AuthCredentials,
  loadCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  restoreSession,
  saveCurrentAccount,
} from "../data/auth";

type AuthContextValue = {
  account: AuthAccount | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthAccount>;
  register: (credentials: AuthCredentials) => Promise<AuthAccount>;
  logout: () => Promise<void>;
  updateAccount: (update: AccountStateUpdate) => Promise<AuthAccount>;
  refreshAccount: () => Promise<AuthAccount>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Runs once at app boot: bring back a token saved from a previous session (if any) and
  // try to load the real account behind it. An invalid/expired token (401) just leaves
  // `account` null — same as never having logged in — rather than surfacing an error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await restoreSession();
      if (!token) {
        if (!cancelled) setIsInitializing(false);
        return;
      }
      try {
        const restoredAccount = await loadCurrentAccount();
        if (!cancelled) setAccount(restoredAccount);
      } catch {
        // Stale or invalid token — nothing to restore, fall through to the login screen.
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function register(credentials: AuthCredentials) {
      const nextAccount = await registerAccount(credentials);
      setAccount(nextAccount);
      return nextAccount;
    }

    async function login(credentials: AuthCredentials) {
      const nextAccount = await loginAccount(credentials);
      setAccount(nextAccount);
      return nextAccount;
    }

    async function logout() {
      await logoutAccount();
      setAccount(null);
    }

    async function updateAccount(update: AccountStateUpdate) {
      const nextAccount = await saveCurrentAccount(update);
      setAccount(nextAccount);
      return nextAccount;
    }

    async function refreshAccount() {
      const nextAccount = await loadCurrentAccount();
      setAccount(nextAccount);
      return nextAccount;
    }

    return {
      account,
      isAuthenticated: Boolean(account),
      isInitializing,
      login,
      register,
      logout,
      updateAccount,
      refreshAccount,
    };
  }, [account, isInitializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
