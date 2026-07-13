import { QueryClient } from '@tanstack/react-query';

// apiClient (api/client.ts) already retries transient network/5xx errors on
// GET requests with backoff, so React Query's own retry is kept minimal to
// avoid compounding delay on top of that.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
