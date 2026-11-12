import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

// React Query's online and focus managers listen to browser events by
// default, which do not exist in React Native. Wire them to NetInfo and
// AppState so stale screens refetch when the app comes back to the
// foreground and when the connection returns.
//
// Called once at module load from providers/queryClient.ts.
let installed = false;

export function installNetworkManagers(): void {
  if (installed || Platform.OS === 'web') return;
  installed = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // isInternetReachable is null while unknown; only treat an explicit
      // false as offline so a slow reachability probe does not flash the
      // offline banner on launch.
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    })
  );

  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (status) => handleFocus(status === 'active'));
    return () => sub.remove();
  });
}
