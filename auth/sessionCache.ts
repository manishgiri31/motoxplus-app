import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthUser, Dealer } from '@/api/types';

// Last (user, dealer) pair the server confirmed. Used only to show the app
// on a cold start with no network: tokens stay in secure storage, this is
// display data (name, business, status), never a credential. Cleared with
// the tokens in AuthProvider#clearSession.
const KEY = 'mx_session_cache_v1';

export interface CachedSession {
  user: AuthUser;
  dealer: Dealer | null;
  savedAt: number;
}

export const sessionCache = {
  async get(): Promise<CachedSession | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedSession;
      return parsed?.user ? parsed : null;
    } catch {
      return null;
    }
  },

  async set(user: AuthUser, dealer: Dealer | null): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify({ user, dealer, savedAt: Date.now() }));
    } catch {
      // Cache is best-effort; a failed write only means no offline fallback.
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
