import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrderTracking } from '@/api/hooks/useOrders';
import { PackageCheck } from '@/components/icons/PackageCheck';
import { Truck } from '@/components/icons/Truck';
import { Button, EmptyState, ErrorState, Skeleton } from '@/src/components/ui';
import { Timeline, type TimelineItem } from '@/src/components/ui/Timeline';
import { colors, radii, screenPaddingX, sectionGap, space, textStyles } from '@/src/theme';
import { isHttpsUrl } from '@/utils/url';

// The carrier's status text is free-form, so match on keywords: a truck for
// events where the parcel is moving, a package-check for the delivery itself.
function trackingEventMarker(status: string): Pick<TimelineItem, 'icon' | 'iconColor'> {
  const s = status.toLowerCase();
  if (/\bdelivered\b/.test(s) && !/\b(not|failed|attempted)\b/.test(s)) {
    return { icon: PackageCheck, iconColor: colors.success };
  }
  if (/dispatch|shipped|in transit|out for delivery|picked up/.test(s)) {
    return { icon: Truck, iconColor: colors.ink2 };
  }
  return {};
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useOrderTracking(id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <TrackingSkeleton />
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

  // Events arrive newest first: the latest one is the "current" pulsing dot,
  // unless it is the delivery itself — the end of the road, nothing pulses.
  const events: TimelineItem[] = data.events.map((event, i) => {
    const marker = trackingEventMarker(event.status);
    return {
      key: `${event.timestamp}-${i}`,
      title: event.status,
      detail: event.activity,
      meta: `${event.location} · ${new Date(event.timestamp).toLocaleString('en-IN')}`,
      state: i === 0 && marker.icon !== PackageCheck ? 'current' : 'done',
      ...marker,
    };
  });

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.waybillBlock}>
            <Text style={styles.label} maxFontSizeMultiplier={1.2}>
              Waybill
            </Text>
            <Text style={styles.waybill} selectable maxFontSizeMultiplier={1.2}>
              {data.waybill}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.statusBlock}>
            <Text style={styles.status} maxFontSizeMultiplier={1.2}>
              {data.status}
            </Text>
            {data.currentLocation ? (
              <Text style={styles.detail} maxFontSizeMultiplier={1.2}>{`Currently at ${data.currentLocation}`}</Text>
            ) : null}
            {data.estimatedDelivery && (
              <Text style={styles.detail} maxFontSizeMultiplier={1.2}>
                {`Estimated delivery: ${new Date(data.estimatedDelivery).toLocaleDateString('en-IN')}`}
              </Text>
            )}
            <Text style={styles.caption} maxFontSizeMultiplier={1.2}>
              {`Last updated ${new Date(data.lastUpdate).toLocaleString('en-IN')}`}
            </Text>
          </View>

          {isHttpsUrl(data.trackingUrl) && (
            <Button
              label="Open carrier"
              variant="link"
              accessibilityLabel="Open carrier website"
              style={styles.carrierLink}
              onPress={() => WebBrowser.openBrowserAsync(data.trackingUrl)}
            />
          )}
        </View>

        <View style={styles.history}>
          <Text accessibilityRole="header" style={styles.historyTitle} maxFontSizeMultiplier={1.2}>
            Tracking history
          </Text>
          {events.length === 0 ? (
            <Text style={styles.detail} maxFontSizeMultiplier={1.2}>
              No tracking events yet.
            </Text>
          ) : (
            <Timeline items={events} markers="dot" />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Same blocks as the loaded screen: waybill card, then timeline rows.
function TrackingSkeleton() {
  return (
    <View style={styles.content}>
      <Skeleton height={220} radius={radii.card} />
      <View style={styles.history}>
        <Skeleton width="40%" height={25} radius={6} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton width={24} height={24} radius={12} />
            <View style={styles.skeletonText}>
              <Skeleton width="50%" height={22} radius={6} />
              <Skeleton width="80%" height={20} radius={6} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: screenPaddingX, paddingBottom: sectionGap, gap: sectionGap },
  card: { gap: space.lg, padding: screenPaddingX, borderRadius: radii.card, backgroundColor: colors.bgAlt },
  waybillBlock: { gap: space.xs },
  label: { ...textStyles.callout },
  waybill: { ...textStyles.cardTitle, fontVariant: ['tabular-nums'] },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  statusBlock: { gap: space.xs },
  status: { ...textStyles.headline },
  detail: { ...textStyles.callout },
  caption: { ...textStyles.caption },
  // The link variant carries 8pt of horizontal padding; pull it back so the text lines up with the card.
  carrierLink: { alignSelf: 'flex-start', marginLeft: -space.sm },
  history: { gap: space.lg },
  historyTitle: { ...textStyles.cardTitle },
  skeletonRow: { flexDirection: 'row', gap: space.lg },
  skeletonText: { flex: 1, gap: space.sm },
});
