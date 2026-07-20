import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { useAuth } from '@/auth/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProviders } from '@/providers/AppProviders';
// Side-effect import — starts the persisted theme preference's rehydration
// (and re-applies it via nativewind's colorScheme.set) as early as possible.
import '@/stores/settingsStore';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
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
          <Stack.Screen name="order/[id]/index" options={{ title: 'Order' }} />
          <Stack.Screen name="order/[id]/tracking" options={{ title: 'Track order' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="search" options={{ title: 'Search', presentation: 'modal' }} />
          <Stack.Screen name="wishlist" options={{ title: 'Wishlist' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
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
