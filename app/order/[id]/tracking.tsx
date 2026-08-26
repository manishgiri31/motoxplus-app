import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrderTracking } from '@/api/hooks/useOrders';
import { EmptyState, ErrorState } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { isHttpsUrl } from '@/utils/url';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useOrderTracking(id);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={error} message="Shipment not created yet for this order." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <EmptyState icon="truck" title="No tracking information yet" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.waybillBlock}>
          <Text style={styles.waybillLabel}>Waybill</Text>
          <Text style={styles.waybillValue}>{data.waybill}</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{data.status}</Text>
          {data.currentLocation ? <Text style={styles.statusMeta}>Currently at {data.currentLocation}</Text> : null}
          {data.estimatedDelivery && (
            <Text style={styles.statusSubMeta}>
              Estimated delivery: {new Date(data.estimatedDelivery).toLocaleDateString('en-IN')}
            </Text>
          )}
          <Text style={styles.statusSubMeta}>Last updated {new Date(data.lastUpdate).toLocaleString('en-IN')}</Text>
        </View>

        {isHttpsUrl(data.trackingUrl) && (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(data.trackingUrl)}
            style={styles.carrierLink}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel="View on carrier's site"
          >
            <Feather name="external-link" size={16} color={colors.red} />
            <Text style={styles.carrierLinkText}>View on carrier&apos;s site</Text>
          </Pressable>
        )}

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Tracking history</Text>
          {data.events.length === 0 ? (
            <Text style={styles.noEvents}>No tracking events yet.</Text>
          ) : (
            data.events.map((event, i) => (
              <View key={`${event.timestamp}-${i}`} style={styles.eventRow}>
                <View style={styles.eventRail}>
                  <View style={[styles.eventDot, i === 0 && styles.eventDotActive]} />
                  {i < data.events.length - 1 && <View style={styles.eventLine} />}
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventStatus}>{event.status}</Text>
                  <Text style={styles.eventActivity}>{event.activity}</Text>
                  <Text style={styles.eventMeta}>
                    {event.location} · {new Date(event.timestamp).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  waybillBlock: { gap: 4 },
  waybillLabel: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted },
  waybillValue: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink },
  statusCard: {
    padding: 16,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  statusText: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  statusMeta: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted },
  statusSubMeta: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  carrierLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  carrierLinkText: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.red },
  historySection: { gap: 12, marginTop: 12 },
  historyTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  noEvents: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted },
  eventRow: { flexDirection: 'row', gap: 12 },
  eventRail: { alignItems: 'center' },
  eventDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line },
  eventDotActive: { backgroundColor: colors.red },
  eventLine: { width: 2, flex: 1, backgroundColor: colors.line, marginVertical: 4 },
  eventBody: { flex: 1, paddingBottom: 16, gap: 1 },
  eventStatus: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.ink },
  eventActivity: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  eventMeta: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.muted },
});
