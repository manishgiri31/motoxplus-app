import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useInfiniteOrders } from '@/api/hooks/useOrders';
import type { Order, OrderStatus } from '@/api/types';
import { orderStatusBadgeTone, orderStatusLabel } from '@/constants/orderStatus';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { Button, EmptyState, ErrorState, Skeleton } from '@/src/components/ui';
import { CompactTitleBar, LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { SegmentedControl, type SegmentedOption } from '@/src/components/ui/SegmentedControl';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { colors, font, radii, screenPaddingX, space } from '@/src/theme';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

type Filter = 'all' | 'active' | 'delivered' | 'cancelled';

const FILTER_OPTIONS: readonly SegmentedOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// The orders endpoint has no status filter, so the tabs filter what has been
// loaded. Returned orders sit under Cancelled so they still show somewhere
// besides All.
const FILTER_STATUSES: Record<Exclude<Filter, 'all'>, OrderStatus[]> = {
  active: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'],
  delivered: ['DELIVERED'],
  cancelled: ['CANCELLED', 'RETURNED'],
};

const EMPTY_COPY: Record<Exclude<Filter, 'all'>, string> = {
  active: 'No active orders',
  delivered: 'No delivered orders',
  cancelled: 'No cancelled orders',
};

// While a filter shows fewer rows than this and more pages exist, keep loading
// instead of leaving the dealer on a nearly empty list.
const MIN_FILTERED_ROWS = 6;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const OrderCard = memo(function OrderCard({ order }: { order: Order }) {
  const focusRing = useFocusRing();
  const count = order.items.length;
  const itemsLabel = `${count} ${count === 1 ? 'item' : 'items'}`;
  const date = formatDate(order.createdAt);
  const status = orderStatusLabel[order.status];

  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        router.push(`/order/${order.id}`);
      }}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${status}, ${date}, ${itemsLabel}, total ${formatCurrency(order.grandTotal)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, focusRing.ringStyle]}
    >
      <View style={styles.topRow}>
        <Text style={styles.orderNumber} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {`#${order.orderNumber}`}
        </Text>
        <StatusBadge label={status} tone={orderStatusBadgeTone[order.status]} />
      </View>
      <Text style={styles.meta} maxFontSizeMultiplier={1.2}>
        {`${date} · ${itemsLabel}`}
      </Text>
      <Text style={styles.total} maxFontSizeMultiplier={1.2}>
        {formatCurrency(order.grandTotal)}
      </Text>
    </Pressable>
  );
});

// Same metrics as OrderCard so rows don't shift when real data swaps in.
function OrderCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Skeleton width="42%" height={22} radius={6} />
        <Skeleton width={72} height={24} radius={radii.pill} />
      </View>
      <Skeleton width="55%" height={20} radius={6} />
      <Skeleton width="28%" height={22} radius={6} />
    </View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useLargeTitleScroll();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteOrders();

  // Pages can shift while the dealer scrolls (a new order pushes one row down a
  // page), so de-duplicate by id.
  const orders = useMemo(() => {
    const seen = new Map<string, Order>();
    for (const page of data?.pages ?? []) {
      for (const order of page.orders) if (!seen.has(order.id)) seen.set(order.id, order);
    }
    return [...seen.values()];
  }, [data]);

  const visible = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => FILTER_STATUSES[filter].includes(o.status))),
    [orders, filter]
  );

  useEffect(() => {
    if (
      filter !== 'all' &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError &&
      visible.length < MIN_FILTERED_ROWS
    ) {
      fetchNextPage();
    }
  }, [filter, hasNextPage, isFetchingNextPage, isFetchNextPageError, visible.length, fetchNextPage]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const onRefresh = useCallback(async () => {
    HapticService.light();
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </View>
      );
    }
    if (isError) return <ErrorState error={error} onRetry={refetch} />;
    // More pages are on the way for this filter: show placeholders, not "empty".
    if (hasNextPage && filter !== 'all' && !isFetchNextPageError) {
      return (
        <View style={styles.skeletonList}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      );
    }
    if (filter === 'all') {
      return (
        <EmptyState
          icon="package"
          title="No orders yet"
          message="Orders you place will show up here."
          actionLabel="Browse catalog"
          onAction={() => router.push('/(tabs)/categories')}
        />
      );
    }
    return (
      <EmptyState
        icon="package"
        title={EMPTY_COPY[filter]}
        actionLabel={orders.length > 0 ? 'Show all orders' : undefined}
        onAction={() => setFilter('all')}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <Animated.FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <OrderCard order={item} />
          </View>
        )}
        ItemSeparatorComponent={Separator}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <LargeTitleHeader title="Orders" scrollY={scrollY} />
            <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} style={styles.segmented} />
          </View>
        }
        ListEmptyComponent={renderEmpty()}
        ListFooterComponent={
          isFetchNextPageError ? (
            <View style={styles.footer}>
              <Button label="Couldn't load more. Try again" variant="link" hideChevron onPress={() => fetchNextPage()} />
            </View>
          ) : isFetchingNextPage ? (
            <View style={styles.footer}>
              <View style={styles.row}>
                <OrderCardSkeleton />
              </View>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink2}
            colors={[colors.ink2]}
            progressViewOffset={insets.top}
          />
        }
      />
      <CompactTitleBar title="Orders" scrollY={scrollY} />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingBottom: space.xxl },
  header: { gap: space.lg, paddingBottom: space.lg },
  segmented: { marginHorizontal: screenPaddingX },
  row: { paddingHorizontal: screenPaddingX },
  separator: { height: space.md },
  skeletonList: { gap: space.md, paddingHorizontal: screenPaddingX },
  footer: { paddingTop: space.md },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgAlt,
  },
  pressed: { opacity: 0.6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  orderNumber: { flexShrink: 1, ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  meta: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  total: {
    ...font(600),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
