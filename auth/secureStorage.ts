import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'mx_access_token';
const REFRESH_TOKEN_KEY = 'mx_refresh_token';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// expo-secure-store ships no web implementation at all — its own
// ExpoSecureStore.web.js is a stub `{}`, so every method throws "... is not
// a function" there instead of just being unavailable. iOS/Android (Keychain
// / Keystore) are unaffected by this branch. localStorage is NOT encrypted
// at rest (readable by anything that can run JS on this origin), unlike the
// native backends — acceptable for local dev/testing on web, but this is not
// an equivalent security posture and shouldn't be treated as one if web is
// ever a real deployment target.
const store: Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'> =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key) => localStorage.getItem(key),
        setItemAsync: async (key, value) => localStorage.setItem(key, value),
        deleteItemAsync: async (key) => localStorage.removeItem(key),
      }
    : SecureStore;

export const secureStorage = {
  async getTokens(): Promise<TokenPair | null> {
    const [accessToken, refreshToken] = await Promise.all([
      store.getItemAsync(ACCESS_TOKEN_KEY),
      store.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },

  async setTokens(tokens: TokenPair): Promise<void> {
    await Promise.all([
      store.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
      store.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      store.deleteItemAsync(ACCESS_TOKEN_KEY),
      store.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
};
