import { router } from 'expo-router';
import { memo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrders } from '@/api/hooks/useOrders';
import type { Order, OrderStatus } from '@/api/types';
import { Badge, type BadgeTone, EmptyState, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/utils/format';

const statusTone: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'brand',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

const OrderRow = memo(function OrderRow({ order }: { order: Order }) {
  return (
    <Pressable
      onPress={() => router.push(`/order/${order.id}`)}
      className="p-lg border-b border-graytone-100 gap-sm active:bg-graytone-50"
    >
      <View className="flex-row justify-between items-start">
        <View className="gap-xxs">
          <Text className="text-[14px] font-semibold text-black">#{order.orderNumber}</Text>
          <Text className="text-[12px] text-graytone-500">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Badge label={order.status} tone={statusTone[order.status]} />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-graytone-500">{order.items.length} item(s)</Text>
        <Text className="text-[14px] font-bold text-black">{formatCurrency(order.grandTotal)}</Text>
      </View>
    </Pressable>
  );
});

export default function OrdersScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(page);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#0A0A0A" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-lg pt-sm pb-lg">
        <Text className="text-h2 font-bold text-black">Orders</Text>
      </View>

      <FlatList
        data={data?.orders ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderRow order={item} />}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState icon="package" title="No orders yet" message="Orders you place will show up here." />
        }
        ListFooterComponent={
          data && totalPages > 1 ? (
            <View className="flex-row items-center justify-center gap-lg py-lg">
              <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
                <Text className={`text-[14px] font-semibold ${page <= 1 ? 'text-graytone-300' : 'text-black'}`}>
                  Previous
                </Text>
              </Pressable>
              <Text className="text-[13px] text-graytone-500">
                Page {page} of {totalPages}
              </Text>
              <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>
                <Text className={`text-[14px] font-semibold ${page >= totalPages ? 'text-graytone-300' : 'text-black'}`}>
                  Next
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
