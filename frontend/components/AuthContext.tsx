import React, { createContext, useContext, useMemo, useState } from "react";
import {
  AccountStateUpdate,
  AuthAccount,
  AuthCredentials,
  loadCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveCurrentAccount,
} from "../data/auth";

type AuthContextValue = {
  account: AuthAccount | null;
  isAuthenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthAccount>;
  register: (credentials: AuthCredentials) => Promise<AuthAccount>;
  logout: () => Promise<void>;
  updateAccount: (update: AccountStateUpdate) => Promise<AuthAccount>;
  refreshAccount: () => Promise<AuthAccount>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AuthAccount | null>(null);

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
      login,
      register,
      logout,
      updateAccount,
      refreshAccount,
    };
  }, [account]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}