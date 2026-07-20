import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrderTracking } from '@/api/hooks/useOrders';
import { EmptyState, ErrorState } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useOrderTracking(id);
  const colors = useThemeColors();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['bottom']}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ErrorState error={error} message="Shipment not created yet for this order." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <EmptyState icon="truck" title="No tracking information yet" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView contentContainerClassName="p-lg gap-lg">
        <View className="gap-xs">
          <Text className="text-[13px] text-muted">Waybill</Text>
          <Text className="text-h3 font-bold text-text">{data.waybill}</Text>
        </View>

        <View className="p-lg rounded-md bg-surface gap-xs">
          <Text className="text-[14px] font-semibold text-text">{data.status}</Text>
          {data.currentLocation ? (
            <Text className="text-[13px] text-muted">Currently at {data.currentLocation}</Text>
          ) : null}
          {data.estimatedDelivery && (
            <Text className="text-[12px] text-muted">
              Estimated delivery: {new Date(data.estimatedDelivery).toLocaleDateString('en-IN')}
            </Text>
          )}
          <Text className="text-[11px] text-muted">Last updated {new Date(data.lastUpdate).toLocaleString('en-IN')}</Text>
        </View>

        {data.trackingUrl && (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(data.trackingUrl)}
            className="flex-row items-center gap-sm py-xs"
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel="View on carrier's site"
          >
            <Feather name="external-link" size={16} color={colors.primary} />
            <Text className="text-[14px] font-semibold text-primary">View on carrier&apos;s site</Text>
          </Pressable>
        )}

        <View className="gap-md mt-md">
          <Text className="text-h3 font-semibold text-text">Tracking history</Text>
          {data.events.length === 0 ? (
            <Text className="text-[13px] text-muted">No tracking events yet.</Text>
          ) : (
            data.events.map((event, i) => (
              <View key={`${event.timestamp}-${i}`} className="flex-row gap-md">
                <View className="items-center">
                  <View className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-border'}`} />
                  {i < data.events.length - 1 && <View className="w-0.5 flex-1 bg-border my-xs" />}
                </View>
                <View className="flex-1 pb-lg">
                  <Text className="text-[13px] font-semibold text-text">{event.status}</Text>
                  <Text className="text-[12px] text-muted">{event.activity}</Text>
                  <Text className="text-[11px] text-muted">
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
