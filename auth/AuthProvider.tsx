import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authService, type LoginPayload } from '@/api/services/authService';
import type { AuthUser, Dealer } from '@/api/types';
import { onAuthFailure } from './authEvents';
import { secureStorage } from './secureStorage';

interface AuthContextValue {
  user: AuthUser | null;
  dealer: Dealer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await secureStorage.clearTokens();
    setUser(null);
    setDealer(null);
  }, []);

  useEffect(() => {
    onAuthFailure(() => {
      setUser(null);
      setDealer(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const tokens = await secureStorage.getTokens();
      if (!tokens) {
        setIsLoading(false);
        return;
      }
      try {
        const { user: meUser, dealer: meDealer } = await authService.me();
        setUser(meUser);
        setDealer(meDealer);
      } catch {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    // STEP 2/3 are colocated here on purpose: useAuth() (auth/useAuth.ts) is
    // a pure `useContext` passthrough with no execution boundary of its own —
    // it re-runs on every render of every consumer, not just on submit, so a
    // log inside the hook itself would be render noise, not signal. This is
    // the first point where "the function useAuth() handed back" actually
    // executes.
    // eslint-disable-next-line no-console
    console.log('STEP 2');
    // eslint-disable-next-line no-console
    console.log('STEP 3');
    const res = await authService.login(payload);
    await secureStorage.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    setUser(res.user);
    setDealer(res.dealer);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => null);
    await clearSession();
  }, [clearSession]);

  const logoutAllDevices = useCallback(async () => {
    await authService.logoutAll().catch(() => null);
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { user: meUser, dealer: meDealer } = await authService.me();
    setUser(meUser);
    setDealer(meDealer);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      dealer,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      logoutAllDevices,
      refreshUser,
    }),
    [user, dealer, isLoading, login, logout, logoutAllDevices, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
