import { QueryClient } from '@tanstack/react-query';

import { installNetworkManagers } from './networkManagers';

installNetworkManagers();

// apiClient (api/client.ts) already retries transient network/5xx errors on
// GET requests once, so React Query does not retry on top of that (the two
// used to multiply into up to six 15 s attempts on a dead network).
//
// networkMode 'always': requests still run (and fail with a visible error
// state) when NetInfo says offline, instead of pausing with a spinner that
// never resolves. onlineManager is still used for refetchOnReconnect and the
// offline banner.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      networkMode: 'always',
    },
    mutations: {
      retry: 0,
      networkMode: 'always',
    },
  },
});
