import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

/**
 * White status-bar icons while this screen is focused (screens whose top is
 * the red brand header: Home, Search), back to the app-wide dark icons on blur.
 * Imperative rather than a <StatusBar> element because tab screens stay
 * mounted (and frozen) when you switch away.
 */
export function useLightStatusBar() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', true);
      return () => setStatusBarStyle('dark', true);
    }, [])
  );
}
