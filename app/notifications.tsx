import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/ui';
import { colors } from '@/src/theme';

// No /api/notifications endpoint exists on the backend (docs/api.md §11) and
// push notifications aren't wired up yet (that's part of the production-readiness
// pass) — this is an honest empty state, not a fake feed.
export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <EmptyState
        icon="bell-off"
        title="No notifications yet"
        message="Order updates and account alerts will appear here once notifications are enabled."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
});
