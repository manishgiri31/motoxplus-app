import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AuthProvider } from '@/auth/AuthProvider';
import { queryClient } from './queryClient';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    // Edge-to-edge Android does not resize the window for the keyboard, so
    // keyboard-controller tracks it instead (KeyboardAwareScrollView etc.).
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
