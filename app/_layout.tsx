import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack, type Href } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { useAuth } from '@/auth/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureNotifications, getNotificationUrl } from '@/hooks/use-push-notifications';
import { AppProviders } from '@/providers/AppProviders';
import { fontsToLoad } from '@/src/theme';
// Side-effect import — starts the persisted theme preference's rehydration
// (and re-applies it via nativewind's colorScheme.set) as early as possible.
import '@/stores/settingsStore';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);
  const ready = !isLoading && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    // iOS-only: blurs the app's content in the app switcher / background
    // snapshot (credit limits, order totals, dealer pricing are visible on
    // most screens). Android's equivalent is FLAG_SECURE, which also blocks
    // in-app screenshots entirely — applied per-screen instead (see
    // ScreenCapture.usePreventScreenCapture on OTP/payment screens) rather
    // than app-wide, since dealers legitimately screenshot the catalog to
    // share with customers.
    if (Platform.OS === 'ios') {
      ScreenCapture.enableAppSwitcherProtectionAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Foreground display behavior + the Android "orders" channel — has to
    // run before any notification could arrive, so it's set up unconditionally
    // here rather than after login (registerPushToken, in AuthProvider, is
    // the part gated on being logged in).
    configureNotifications();

    // Tapping a push (background or killed-state) always has to at least
    // attempt this navigation — if the dealer isn't authenticated,
    // Stack.Protected above redirects to login instead of the order, which
    // is an acceptable degrade rather than something to special-case here.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = getNotificationUrl(response.notification.request.content.data);
      if (url) router.push(url as never);
    });
    return () => subscription.remove();
  }, []);

  if (!ready) {
    // Native splash screen is still visible at this point.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
          <Stack.Screen name="category/[slug]" options={{ title: 'Category' }} />
          <Stack.Screen name="vehicle-parts" options={{ title: 'Compatible parts' }} />
          <Stack.Screen name="order/[id]/index" options={{ title: 'Order' }} />
          <Stack.Screen name="order/[id]/tracking" options={{ title: 'Track order' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="order-placed" options={{ title: 'Order placed', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="search" options={{ title: 'Search', presentation: 'modal' }} />
          <Stack.Screen name="wishlist" options={{ title: 'Wishlist' }} />
          <Stack.Screen name="invoices" options={{ title: 'Invoices' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="verify-email" options={{ title: 'Verify email', presentation: 'modal' }} />
          <Stack.Screen name="verify-mobile" options={{ title: 'Verify mobile', presentation: 'modal' }} />
          <Stack.Screen name="change-email" options={{ title: 'Change email', presentation: 'modal' }} />
          <Stack.Screen name="sessions" options={{ title: 'Active sessions' }} />
          <Stack.Screen name="order/[id]/pay-upi" options={{ title: 'Complete payment' }} />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {/* Redesigned screens are light-only (bg paper) regardless of the
          system/Settings dark-mode preference, so "auto" would show white
          icons on a light background whenever dark mode is active — force
          dark icons since the redesign now covers most of the primary flow. */}
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    // ProductGallery's pinch/pan/double-tap zoom uses GestureDetector, which
    // requires a GestureHandlerRootView ancestor somewhere in the tree —
    // without it, react-native-gesture-handler throws "GestureDetector must
    // be used as a descendant of GestureHandlerRootView" the moment any
    // screen using it mounts (every product detail screen). style={{flex:1}}
    // is required too — omitting it leaves the view collapsed to zero size.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
