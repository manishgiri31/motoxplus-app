import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrderTracking } from '@/api/hooks/useOrders';
import { EmptyState, ErrorState } from '@/components/ui';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useOrderTracking(id);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['bottom']}>
        <ActivityIndicator color="#0A0A0A" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ErrorState error={error} message="Shipment not created yet for this order." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <EmptyState icon="truck" title="No tracking information yet" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView contentContainerClassName="p-lg gap-lg">
        <View className="gap-xs">
          <Text className="text-[13px] text-graytone-500">Waybill</Text>
          <Text className="text-h3 font-bold text-black">{data.waybill}</Text>
        </View>

        <View className="p-lg rounded-md bg-graytone-50 gap-xs">
          <Text className="text-[14px] font-semibold text-black">{data.status}</Text>
          {data.currentLocation ? (
            <Text className="text-[13px] text-graytone-600">Currently at {data.currentLocation}</Text>
          ) : null}
          {data.estimatedDelivery && (
            <Text className="text-[12px] text-graytone-500">
              Estimated delivery: {new Date(data.estimatedDelivery).toLocaleDateString('en-IN')}
            </Text>
          )}
          <Text className="text-[11px] text-graytone-400">Last updated {new Date(data.lastUpdate).toLocaleString('en-IN')}</Text>
        </View>

        {data.trackingUrl && (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(data.trackingUrl)}
            className="flex-row items-center gap-sm"
          >
            <Feather name="external-link" size={16} color="#E4111A" />
            <Text className="text-[14px] font-semibold text-brandred-500">View on carrier&apos;s site</Text>
          </Pressable>
        )}

        <View className="gap-md mt-md">
          <Text className="text-h3 font-semibold text-black">Tracking history</Text>
          {data.events.length === 0 ? (
            <Text className="text-[13px] text-graytone-500">No tracking events yet.</Text>
          ) : (
            data.events.map((event, i) => (
              <View key={`${event.timestamp}-${i}`} className="flex-row gap-md">
                <View className="items-center">
                  <View className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-brandred-500' : 'bg-graytone-300'}`} />
                  {i < data.events.length - 1 && <View className="w-0.5 flex-1 bg-graytone-200 my-xs" />}
                </View>
                <View className="flex-1 pb-lg">
                  <Text className="text-[13px] font-semibold text-black">{event.status}</Text>
                  <Text className="text-[12px] text-graytone-500">{event.activity}</Text>
                  <Text className="text-[11px] text-graytone-400">
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
