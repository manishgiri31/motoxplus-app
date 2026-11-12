import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

// Device connectivity as React Query's onlineManager sees it (wired to
// NetInfo in providers/networkManagers.ts).
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true
  );
}
