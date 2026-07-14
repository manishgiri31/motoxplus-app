import { router } from 'expo-router';
import { memo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrders } from '@/api/hooks/useOrders';
import type { Order, OrderStatus } from '@/api/types';
import { Badge, type BadgeTone, EmptyState, ErrorState } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
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
      className="p-lg border-b border-border gap-sm active:bg-surface"
    >
      <View className="flex-row justify-between items-start">
        <View className="gap-xxs">
          <Text className="text-[14px] font-semibold text-text">#{order.orderNumber}</Text>
          <Text className="text-[12px] text-muted">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Badge label={order.status} tone={statusTone[order.status]} />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-muted">{order.items.length} item(s)</Text>
        <Text className="text-[14px] font-bold text-text">{formatCurrency(order.grandTotal)}</Text>
      </View>
    </Pressable>
  );
});

export default function OrdersScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(page);
  const colors = useThemeColors();

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-lg pt-sm pb-lg">
        <Text className="text-h2 font-bold text-text">Orders</Text>
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
                <Text className={`text-[14px] font-semibold ${page <= 1 ? 'text-muted' : 'text-text'}`}>
                  Previous
                </Text>
              </Pressable>
              <Text className="text-[13px] text-muted">
                Page {page} of {totalPages}
              </Text>
              <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)}>
                <Text className={`text-[14px] font-semibold ${page >= totalPages ? 'text-muted' : 'text-text'}`}>
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
