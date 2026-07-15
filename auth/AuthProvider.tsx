import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authService, type LoginPayload } from '@/api/services/authService';
import type { AuthUser, Dealer } from '@/api/types';
import { canAccessDealerApp, DealerAccessDeniedError } from './access';
import { onAuthFailure } from './authEvents';
import { secureStorage } from './secureStorage';

interface AuthContextValue {
  user: AuthUser | null;
  dealer: Dealer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Set when a resolved (user, dealer) pair failed canAccessDealerApp() —
  // either at login or while restoring a session on cold start. The login
  // screen watches this to redirect to the Access Denied screen; it never
  // needs to inspect role/status itself.
  accessDenied: boolean;
  clearAccessDenied: () => void;
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
  const [accessDenied, setAccessDenied] = useState(false);
  const clearAccessDenied = useCallback(() => setAccessDenied(false), []);

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
        // A previously-issued token can outlive an approval being revoked, a
        // role change, or simply belong to a non-dealer account — re-check
        // on every cold start rather than trusting the token alone. This is
        // a real rejection (valid token, disallowed account), so surface it
        // via accessDenied rather than silently dropping back to a blank
        // login screen.
        if (!canAccessDealerApp(meUser, meDealer)) {
          await clearSession();
          setAccessDenied(true);
          return;
        }
        setUser(meUser);
        setDealer(meDealer);
      } catch {
        // Token invalid/expired or the request failed outright — an
        // ordinary "session no longer valid" case, not an access-denied
        // one, so just drop back to a plain login screen.
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
    if (!canAccessDealerApp(res.user, res.dealer)) {
      // Do not persist tokens for a disallowed account, even briefly.
      setAccessDenied(true);
      throw new DealerAccessDeniedError();
    }
    setAccessDenied(false);
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

  // Re-resolves the current (user, dealer) pair through the same gate as
  // login/session-restore. Not called anywhere today, but any future caller
  // (e.g. a "refresh after profile edit" action) inherits the access check
  // for free rather than needing to remember to add it.
  const refreshUser = useCallback(async () => {
    const { user: meUser, dealer: meDealer } = await authService.me();
    if (!canAccessDealerApp(meUser, meDealer)) {
      await clearSession();
      setAccessDenied(true);
      return;
    }
    setUser(meUser);
    setDealer(meDealer);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      dealer,
      isLoading,
      isAuthenticated: !!user,
      accessDenied,
      clearAccessDenied,
      login,
      logout,
      logoutAllDevices,
      refreshUser,
    }),
    [user, dealer, isLoading, accessDenied, clearAccessDenied, login, logout, logoutAllDevices, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
