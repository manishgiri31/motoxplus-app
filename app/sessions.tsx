import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRevokeSession, useSessions } from '@/api/hooks/useSessions';
import { getErrorMessage } from '@/api/errors';
import type { UserSessionInfo } from '@/api/types';
import { Badge, Card, ErrorState } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

const DEVICE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  Mobile: 'smartphone',
  Tablet: 'tablet',
  Desktop: 'monitor',
};

export default function SessionsScreen() {
  const { data, isLoading, isError, error, refetch } = useSessions();
  const revokeSession = useRevokeSession();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const confirmRevoke = (session: UserSessionInfo) => {
    Alert.alert('Sign out this device?', 'This will immediately end that session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          setRevokingId(session.id);
          revokeSession.mutate(session.id, {
            onSuccess: () => HapticService.light(),
            onError: (err) => Alert.alert('Could not sign out that device', getErrorMessage(err)),
            onSettled: () => setRevokingId(null),
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator color={colors.ink} />
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

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={data.sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const isCurrent = item.id === data.currentSessionId;
          return (
            <Card style={styles.row}>
              <Feather name={DEVICE_ICON[item.deviceInfo] ?? 'globe'} size={22} color={colors.ink} />
              <View style={styles.rowInfo}>
                <View style={styles.rowHeader}>
                  <Text style={styles.deviceLabel}>{item.deviceInfo}</Text>
                  {isCurrent && <Badge label="This device" variant="brand" />}
                </View>
                {item.ipAddress && <Text style={styles.meta}>{item.ipAddress}</Text>}
                <Text style={styles.meta}>Last active {new Date(item.lastUsedAt).toLocaleString('en-IN')}</Text>
              </View>
              {!isCurrent && (
                <Pressable
                  onPress={() => confirmRevoke(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Sign out ${item.deviceInfo}`}
                  disabled={revokingId === item.id}
                >
                  {revokingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.red} />
                  ) : (
                    <Feather name="log-out" size={18} color={colors.red} />
                  )}
                </Pressable>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={styles.meta}>No active sessions.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowInfo: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceLabel: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  meta: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
});
