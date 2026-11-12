import type Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRevokeSession, useSessions } from '@/api/hooks/useSessions';
import { getErrorMessage } from '@/api/errors';
import type { UserSessionInfo } from '@/api/types';
import { ErrorState, GroupedList, ListRow, Skeleton, Toast } from '@/src/components/ui';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { colors, font, layout, radii, screenPaddingX, sectionGap, space } from '@/src/theme';
import { formatDateTime } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

type IconName = React.ComponentProps<typeof Feather>['name'];

// deviceInfo is free text from the server ("Samsung Galaxy M34 · Android 14",
// "Chrome on Windows 11"), so pick the icon by keyword.
function deviceIcon(deviceInfo: string): IconName {
  if (/ipad|tablet/i.test(deviceInfo)) return 'tablet';
  if (/android|iphone|ios|mobile|phone/i.test(deviceInfo)) return 'smartphone';
  return 'monitor';
}

function sessionSubtitle(session: UserSessionInfo, isCurrent: boolean) {
  const active = isCurrent ? 'Active now' : `Last active ${formatDateTime(session.lastUsedAt)}`;
  return session.ipAddress ? `${active} · ${session.ipAddress}` : active;
}

export default function SessionsScreen() {
  const { data, isLoading, isError, error, refetch } = useSessions();
  const revokeSession = useRevokeSession();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const confirmRevoke = (session: UserSessionInfo) => {
    Alert.alert('Sign out this device?', 'This will immediately end that session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          setRevokingId(session.id);
          revokeSession.mutate(session.id, {
            onSuccess: () => {
              HapticService.light();
              setToastMessage('Device signed out');
            },
            onError: (err) => Alert.alert('Could not sign out that device', getErrorMessage(err)),
            onSettled: () => setRevokingId(null),
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.content}>
          <Skeleton height={3 * 68} radius={radii.card} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  // The current device first, then the most recently used.
  const sessions = [...data.sessions].sort((a, b) =>
    a.id === data.currentSessionId ? -1 : b.id === data.currentSessionId ? 1 : +new Date(b.lastUsedAt) - +new Date(a.lastUsedAt)
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {sessions.length === 0 ? (
          <Text style={styles.empty} maxFontSizeMultiplier={1.2}>
            No active sessions.
          </Text>
        ) : (
          <GroupedList footer="Signing out a device ends its session there straight away. You stay signed in on this phone.">
            {sessions.map((session) => {
              const isCurrent = session.id === data.currentSessionId;
              const revoking = revokingId === session.id;
              return (
                <ListRow
                  key={session.id}
                  icon={deviceIcon(session.deviceInfo)}
                  iconColor={isCurrent ? colors.success : colors.ink2}
                  label={session.deviceInfo}
                  subtitle={sessionSubtitle(session, isCurrent)}
                  accessibilityLabel={`${session.deviceInfo}, ${sessionSubtitle(session, isCurrent)}${isCurrent ? ', this device' : ''}`}
                  trailing={
                    isCurrent ? (
                      <StatusBadge label="This device" tone="success" />
                    ) : (
                      <Pressable
                        onPress={() => confirmRevoke(session)}
                        disabled={revoking}
                        accessibilityRole="button"
                        accessibilityLabel={`Sign out ${session.deviceInfo}`}
                        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
                      >
                        {revoking ? (
                          <ActivityIndicator size="small" color={colors.red} />
                        ) : (
                          <Text style={styles.signOutLabel} maxFontSizeMultiplier={1.2}>
                            Sign out
                          </Text>
                        )}
                      </Pressable>
                    )
                  }
                />
              );
            })}
          </GroupedList>
        )}
      </ScrollView>
      {toastMessage && <Toast message={toastMessage} onHide={() => setToastMessage(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: screenPaddingX, paddingTop: space.xl, paddingBottom: sectionGap },
  empty: { ...font(400), fontSize: 17, lineHeight: 22, color: colors.ink2, textAlign: 'center', marginTop: space.x4 },
  signOut: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: -space.sm,
    paddingHorizontal: space.sm,
  },
  signOutLabel: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.red },
  pressed: { opacity: 0.6 },
});
