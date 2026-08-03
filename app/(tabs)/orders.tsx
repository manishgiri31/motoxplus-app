import { router } from 'expo-router';
import { memo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrders } from '@/api/hooks/useOrders';
import type { Order } from '@/api/types';
import { orderStatusVariant } from '@/constants/orderStatus';
import { Badge, Card, MonoLabel, SkeletonListRow } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

const OrderRow = memo(function OrderRow({ order }: { order: Order }) {
  return (
    <Card onPress={() => router.push(`/order/${order.id}`)} accessibilityLabel={`Order ${order.orderNumber}`} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.idCol}>
          <MonoLabel color="ink">{`#${order.orderNumber}`}</MonoLabel>
          <Text style={styles.date}>
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Badge label={order.status} variant={orderStatusVariant[order.status]} />
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.itemCount}>{order.items.length} item(s)</Text>
        <Text style={styles.total}>{formatCurrency(order.grandTotal)}</Text>
      </View>
    </Card>
  );
});

export default function OrdersScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useOrders(page);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
        </View>
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonListRow key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ErrorFallback error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      <FlatList
        data={data?.orders ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderRow order={item} />}
        contentContainerStyle={(data?.orders ?? []).length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => {
              HapticService.light();
              refetch();
            }}
            tintColor={colors.red}
            colors={[colors.red]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyMessage}>Orders you place will show up here.</Text>
          </View>
        }
        ListFooterComponent={
          data && totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                disabled={page <= 1}
                onPress={() => setPage((p) => p - 1)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                accessibilityState={{ disabled: page <= 1 }}
              >
                <Text style={[styles.pageLink, page <= 1 && styles.pageLinkDisabled]}>Previous</Text>
              </Pressable>
              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>
              <Pressable
                disabled={page >= totalPages}
                onPress={() => setPage((p) => p + 1)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Next page"
                accessibilityState={{ disabled: page >= totalPages }}
              >
                <Text style={[styles.pageLink, page >= totalPages && styles.pageLinkDisabled]}>Next</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function ErrorFallback({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  // Local, minimal — avoids pulling in the old ErrorState just for one screen
  // while still surfacing a real retry action.
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptyMessage}>{error instanceof Error ? error.message : 'Please try again.'}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry">
        <Text style={styles.pageLink}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 24, color: colors.ink },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  idCol: { gap: 4 },
  date: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  itemCount: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted },
  total: { fontFamily: fonts.display.bold, fontSize: 17, color: colors.ink },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 16 },
  pageLink: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  pageLinkDisabled: { color: colors.muted },
  pageLabel: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted },
  emptyContent: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: fonts.display.bold, fontSize: 17, color: colors.ink },
  emptyMessage: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
