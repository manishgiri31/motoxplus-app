import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/ui';
import { colors } from '@/src/theme';

// Order push notifications ARE wired up (see hooks/use-push-notifications.ts +
// the /api/mobile/push-token endpoints), but they're delivered live only — the
// backend persists no notification history and exposes no GET /api/notifications
// feed, so there is nothing to list here. This stays an honest empty state
// rather than a fabricated feed; tapping a push routes straight to /order/[id].
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
