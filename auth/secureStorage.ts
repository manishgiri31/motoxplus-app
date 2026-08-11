import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'mx_access_token';
const REFRESH_TOKEN_KEY = 'mx_refresh_token';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// WHEN_UNLOCKED_THIS_DEVICE_ONLY (rather than the SDK default, plain
// WHEN_UNLOCKED) excludes these from iCloud/iTunes device backups — a
// refresh token restored from a backup onto a different physical device
// would otherwise still be valid there.
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type TokenStore = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const nativeStore: TokenStore = {
  getItemAsync: (key) => SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
};

// expo-secure-store ships no web implementation — every method throws
// "... is not a function" there. iOS/Android (Keychain/Keystore) are
// unaffected by this branch.
//
// localStorage is NOT encrypted at rest and has no keychain backing, so it
// is not an equivalent security posture. Web isn't a real release target for
// this app (see docs/release-checklist.md), so a production web build fails
// closed here — no token persistence at all — rather than silently
// downgrading token security for a target nobody ships. The localStorage
// fallback only runs in __DEV__, for local `expo start --web` testing.
const webDevStore: TokenStore = {
  getItemAsync: async (key) => localStorage.getItem(key),
  setItemAsync: async (key, value) => {
    localStorage.setItem(key, value);
  },
  deleteItemAsync: async (key) => {
    localStorage.removeItem(key);
  },
};

const noopStore: TokenStore = {
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
};

const store: TokenStore = Platform.OS === 'web' ? (__DEV__ ? webDevStore : noopStore) : nativeStore;

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
    await Promise.all([store.deleteItemAsync(ACCESS_TOKEN_KEY), store.deleteItemAsync(REFRESH_TOKEN_KEY)]);
  },
};
