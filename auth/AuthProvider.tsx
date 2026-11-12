import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';

import { authService, type LoginPayload } from '@/api/services/authService';
import type { AuthUser, Dealer, LoginOtpPayload, LoginResponse } from '@/api/types';
import { registerPushToken, unregisterPushToken } from '@/hooks/use-push-notifications';
import { canAccessDealerApp, DealerAccessDeniedError } from './access';
import { onAuthFailure, onVerificationRequired } from './authEvents';
import { secureStorage } from './secureStorage';
import { sessionCache } from './sessionCache';
import { isSessionRejection } from './sessionPolicy';

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
  // Server unreachable on cold start, showing the last confirmed account
  // from cache. Tokens are still stored; cleared only on a 401/403.
  isOffline: boolean;
  // Server unreachable on cold start and no cached account to show — the
  // root layout renders a "No connection, retry" screen.
  connectionError: boolean;
  isRetrying: boolean;
  retryConnection: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithOtp: (payload: LoginOtpPayload) => Promise<void>;
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
  const [isOffline, setIsOffline] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const clearAccessDenied = useCallback(() => setAccessDenied(false), []);

  const queryClient = useQueryClient();

  // Tracked outside state because there's no way to ask the OS "what push
  // token did we last register" — it only ever exists in memory from the
  // moment registerPushToken() resolves, so unregistering at logout has to
  // read it from here rather than re-deriving it.
  const pushTokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    await secureStorage.clearTokens();
    await sessionCache.clear();
    unregisterPushToken(pushTokenRef.current);
    pushTokenRef.current = null;
    setUser(null);
    setDealer(null);
    setIsOffline(false);
    setConnectionError(false);
    // Otherwise a second dealer signing in on the same device is served the
    // first dealer's cached cart/orders/invoices/address until each query
    // happens to refetch — this data is dealer-specific, not device-specific.
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    onAuthFailure(() => {
      // api/client.ts already cleared secure storage before firing this —
      // just drop the cached account and in-memory push token to match.
      sessionCache.clear();
      unregisterPushToken(pushTokenRef.current);
      pushTokenRef.current = null;
      setUser(null);
      setDealer(null);
      setIsOffline(false);
      setConnectionError(false);
      queryClient.clear();
    });
  }, [queryClient]);

  // api/client.ts fires this whenever a cart/order/payment POST 403s with
  // "account not verified" — read the latest user via a ref rather than
  // re-registering the listener on every user change (onVerificationRequired
  // only keeps a single most-recent listener).
  const userRef = useRef<AuthUser | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Several requests can hit the same 403 at once (cart badge, cart screen,
  // retries) — show the prompt once, then stay quiet for a while.
  const verifyPromptShownAt = useRef(0);
  useEffect(() => {
    onVerificationRequired(() => {
      const now = Date.now();
      if (now - verifyPromptShownAt.current < 60_000) return;
      verifyPromptShownAt.current = now;
      const current = userRef.current;
      const target = current && !current.emailVerified ? '/verify-email' : '/verify-mobile';
      Alert.alert(
        'Verify your account',
        'Your email and mobile number must be verified before you can add to cart or place an order.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Verify now', onPress: () => router.push(target) },
        ]
      );
    });
  }, []);

  // Checks the stored tokens with GET /mobile/auth/me and applies the result.
  const verifySession = useCallback(async () => {
    try {
      const { user: meUser, dealer: meDealer } = await authService.me();
      // Signed out while this request was in flight (background check on
      // cold start): don't bring the account back.
      if (!(await secureStorage.getTokens().catch(() => null))) return;
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
      setIsOffline(false);
      setConnectionError(false);
      sessionCache.set(meUser, meDealer);
      // Fire-and-forget: refreshes the registered token on every cold
      // start (Expo push tokens can occasionally rotate on reinstall) —
      // never awaited, so a slow/denied permission prompt can't delay
      // showing the app past the splash screen.
      registerPushToken().then((token) => {
        pushTokenRef.current = token;
      });
    } catch (err) {
      // Only a 401/403 from the server ends the session. By the time a 401
      // reaches here api/client.ts has already tried a refresh and been
      // refused (a refresh that merely failed to connect rejects with that
      // network error instead, see client.ts).
      if (isSessionRejection(err)) {
        await clearSession();
        return;
      }
      // Network error, timeout, 5xx, malformed body: the session may well
      // be fine. Keep the tokens and show the last confirmed account.
      const cached = await sessionCache.get();
      if (cached && canAccessDealerApp(cached.user, cached.dealer)) {
        setUser(cached.user);
        setDealer(cached.dealer);
        setIsOffline(true);
        setConnectionError(false);
      } else {
        // Nothing to show offline — the root layout renders a "No
        // connection, retry" screen instead of the login screen.
        setConnectionError(true);
      }
    }
  }, [clearSession]);

  // Restores the stored session against the server. Runs on cold start, from
  // the "No connection" screen's retry, and when the app returns to the
  // foreground (or the network comes back) while showing a cached session.
  //
  // showCachedFirst (cold start only): when a confirmed account is cached,
  // show it straight away and check with the server in the background, so
  // startup never waits on the network (it used to wait up to ~46 s on a
  // slow connection). The server still re-checks access on every request,
  // and a 401/403 or a revoked account signs out as soon as the check lands.
  const restoreSession = useCallback(async (opts?: { showCachedFirst?: boolean }) => {
    // A storage read failure (corrupted keychain entry, OS-level access
    // error, ...) must degrade to "no session" like a missing token would,
    // not leave isLoading stuck true forever — the splash screen only
    // hides once isLoading flips to false (see RootLayout), so an
    // uncaught throw here previously meant a permanently blank app with
    // no way to recover short of reinstalling.
    let tokens: Awaited<ReturnType<typeof secureStorage.getTokens>> = null;
    try {
      tokens = await secureStorage.getTokens();
    } catch {
      return;
    }
    if (!tokens) return;

    if (opts?.showCachedFirst) {
      const cached = await sessionCache.get();
      if (cached && canAccessDealerApp(cached.user, cached.dealer)) {
        setUser(cached.user);
        setDealer(cached.dealer);
        void verifySession();
        return;
      }
    }
    await verifySession();
  }, [verifySession]);

  useEffect(() => {
    restoreSession({ showCachedFirst: true }).finally(() => setIsLoading(false));
  }, [restoreSession]);

  const [isRetrying, setIsRetrying] = useState(false);
  const retryConnection = useCallback(async () => {
    setIsRetrying(true);
    try {
      await restoreSession();
    } finally {
      setIsRetrying(false);
    }
  }, [restoreSession]);

  // While showing a cached session, re-check whenever the app comes back to
  // the foreground so it leaves the offline state as soon as the server is
  // reachable again (or signs out if the server now refuses the session).
  useEffect(() => {
    if (!isOffline) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') restoreSession();
    });
    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) restoreSession();
    });
    return () => {
      sub.remove();
      unsubscribeOnline();
    };
  }, [isOffline, restoreSession]);

  // Shared tail of every sign-in method (password, one-time code): the same
  // dealer gate, token persistence and push registration.
  const completeLogin = useCallback(async (res: LoginResponse) => {
    if (!canAccessDealerApp(res.user, res.dealer)) {
      // Do not persist tokens for a disallowed account, even briefly.
      setAccessDenied(true);
      throw new DealerAccessDeniedError();
    }
    setAccessDenied(false);
    await secureStorage.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    sessionCache.set(res.user, res.dealer);
    setUser(res.user);
    setDealer(res.dealer);
    setIsOffline(false);
    setConnectionError(false);
    // Fire-and-forget, same reasoning as the cold-start path above — a
    // permission prompt must never block the login screen from proceeding.
    registerPushToken().then((token) => {
      pushTokenRef.current = token;
    });
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => completeLogin(await authService.login(payload)),
    [completeLogin]
  );

  const loginWithOtp = useCallback(
    async (payload: LoginOtpPayload) => completeLogin(await authService.loginWithOtp(payload)),
    [completeLogin]
  );

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
    sessionCache.set(meUser, meDealer);
    setUser(meUser);
    setDealer(meDealer);
    setIsOffline(false);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      dealer,
      isLoading,
      isAuthenticated: !!user,
      accessDenied,
      clearAccessDenied,
      isOffline,
      connectionError,
      isRetrying,
      retryConnection,
      login,
      loginWithOtp,
      logout,
      logoutAllDevices,
      refreshUser,
    }),
    [
      user,
      dealer,
      isLoading,
      accessDenied,
      clearAccessDenied,
      isOffline,
      connectionError,
      isRetrying,
      retryConnection,
      login,
      loginWithOtp,
      logout,
      logoutAllDevices,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
