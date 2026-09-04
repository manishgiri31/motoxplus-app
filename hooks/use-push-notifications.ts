import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { pushService } from '@/api/services/pushService';
import type { DevicePlatform } from '@/api/types';
import { logger } from '@/utils/logger';

// Matches the config plugin's defaultChannel (app.config.js) and the channelId
// the backend sends order notifications on (src/lib/push/send.ts on the
// website) — Android routes a push to this channel by id.
const ORDER_CHANNEL_ID = 'orders';

// One-time, auth-independent setup: how a notification behaves while the app
// is in the foreground, plus the Android channel it's delivered on. Safe to
// call before login (e.g. from the root layout).
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
      name: 'Orders',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

// Best-effort: request permission, fetch the Expo push token, register it
// with the backend. Never throws — a denied permission or a flaky network
// must never block login (api/services/pushService.ts is best-effort for the
// same reason). Returns the token so the caller can hold onto it for
// unregisterPushToken() at logout — the OS gives no way to look it back up
// otherwise.
export async function registerPushToken(): Promise<string | null> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    const status = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!status.granted) return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      logger.warn('Push registration skipped: no EAS projectId in app config');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform: DevicePlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    await pushService.register({ token, platform });
    return token;
  } catch (err) {
    logger.warn('Push token registration failed', { err: err instanceof Error ? err.message : err });
    return null;
  }
}

export async function unregisterPushToken(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await pushService.unregister(token);
  } catch {
    // Best-effort — a stale token left server-side just means one wasted
    // push attempt later (silently dropped by Expo), not a real problem.
  }
}

// The data payload shape notifyOrderEvent() sends (api/types.ts's
// OrderNotificationData) — read loosely since it crosses the JS/native
// notification bridge untyped.
export function getNotificationUrl(data: unknown): string | null {
  if (data && typeof data === 'object' && 'url' in data && typeof (data as { url: unknown }).url === 'string') {
    return (data as { url: string }).url;
  }
  return null;
}
