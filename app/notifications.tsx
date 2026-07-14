import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';

// No /api/notifications endpoint exists on the backend (docs/api.md §11) and
// push notifications aren't wired up yet (that's part of the production-readiness
// pass) — this is an honest empty state, not a fake feed.
export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <EmptyState
        icon="bell-off"
        title="No notifications yet"
        message="Order updates and account alerts will appear here once notifications are enabled."
      />
    </SafeAreaView>
  );
}
