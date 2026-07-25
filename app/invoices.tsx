import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAllOrders } from '@/api/hooks/useAllOrders';
import type { Order } from '@/api/types';
import { EmptyState, ErrorState, OrderRowSkeleton } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

const InvoiceRow = memo(function InvoiceRow({ order }: { order: Order }) {
  const colors = useThemeColors();
  const invoice = order.invoice!;

  return (
    <Pressable
      onPress={() => router.push(`/order/${order.id}`)}
      className="flex-row items-center justify-between p-lg border-b border-border active:bg-surface"
      accessibilityRole="button"
      accessibilityLabel={`Invoice ${invoice.invoiceNumber}, order ${order.orderNumber}, ${formatCurrency(invoice.grandTotal)}`}
    >
      <View className="flex-1 pr-md gap-xxs">
        <Text className="text-[14px] font-semibold text-text">Invoice #{invoice.invoiceNumber}</Text>
        <Text className="text-[12px] text-muted">
          Order #{order.orderNumber} ·{' '}
          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <View className="flex-row items-center gap-sm">
        <Text className="text-[14px] font-bold text-text">{formatCurrency(invoice.grandTotal)}</Text>
        <Feather name="chevron-right" size={18} color={colors.border} />
      </View>
    </Pressable>
  );
});

export default function InvoicesScreen() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAllOrders();

  const invoices = useMemo(
    () =>
      (data?.orders ?? [])
        .filter((o) => o.invoice)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [data]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        {Array.from({ length: 6 }).map((_, i) => (
          <OrderRowSkeleton key={i} />
        ))}
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InvoiceRow order={item} />}
        contentContainerClassName={invoices.length === 0 ? 'flex-1' : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => {
              HapticService.light();
              refetch();
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title="No invoices yet"
            message="Invoices are generated once an order is confirmed."
            actionLabel="View orders"
            onAction={() => router.push('/(tabs)/orders')}
          />
        }
        ListFooterComponent={
          data?.truncated ? (
            <Text className="text-[12px] text-muted text-center py-lg px-lg">
              Showing invoices from your most recent orders.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
