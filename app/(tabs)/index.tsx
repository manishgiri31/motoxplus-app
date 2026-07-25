import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { memo, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDealerSummary } from '@/api/hooks/useDealerSummary';
import { useProducts } from '@/api/hooks/useProducts';
import type { Product } from '@/api/types';
import { BannerCarousel, type BannerSlide } from '@/components/BannerCarousel';
import { Avatar, Badge, Button, ProductCard, ProductCardSkeleton, Skeleton } from '@/components/ui';
import { webOrigin } from '@/config/env';
import { dealerStatusTone } from '@/constants/dealerStatus';
import { orderStatusTone } from '@/constants/orderStatus';
import { useAuth } from '@/auth/useAuth';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { FREE_DELIVERY_THRESHOLD } from '@/utils/cartTotals';
import { discountPercent, formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

// Module-level (not recreated per render) so ProductCard's memo() comparison
// sees a stable onPress reference instead of a new closure every render.
function openProduct(product: Product) {
  router.push(`/product/${product.id}`);
}

// No banner API exists on the backend — these are static, client-side
// promo slides. Module-level so BannerCarousel's props stay referentially
// stable across renders.
const PROMO_SLIDES: BannerSlide[] = [
  {
    id: 'genuine-parts',
    eyebrow: 'Genuine Parts, Direct to Dealer',
    title: 'Order in minutes,\ndelivered nationwide.',
  },
  {
    id: 'free-delivery',
    eyebrow: 'Free Delivery',
    title: `Free shipping on orders\nover ${formatCurrency(FREE_DELIVERY_THRESHOLD)}.`,
  },
  {
    id: 'new-arrivals',
    eyebrow: 'New This Week',
    title: 'Fresh stock added\nevery week.',
  },
];

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const ProductRail = memo(function ProductRail({ title, products }: { title: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <View className="gap-md mb-2xl">
      <Text className="text-h3 font-semibold text-text px-lg">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-lg gap-md">
        {products.map((product) => (
          <View key={product.id} className="w-40">
            <ProductCard product={product} onPress={openProduct} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

function ProductRailSkeleton({ title }: { title: string }) {
  return (
    <View className="gap-md mb-2xl">
      <Text className="text-h3 font-semibold text-text px-lg">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-lg gap-md">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="w-40">
            <ProductCardSkeleton />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

interface StatCardProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  warn?: boolean;
  onPress?: () => void;
}

function StatCard({ icon, label, value, warn = false, onPress }: StatCardProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={
        onPress &&
        (() => {
          HapticService.light();
          onPress();
        })
      }
      disabled={!onPress}
      className="w-[47%] bg-card border border-border rounded-lg p-lg gap-sm active:opacity-80"
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View className="w-9 h-9 rounded-full bg-surface items-center justify-center">
        <Feather name={icon} size={16} color={warn ? colors.warning : colors.primary} />
      </View>
      <Text className={`text-[19px] font-bold ${warn ? 'text-warning' : 'text-text'}`} numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-[12px] text-muted" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatGridSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-md px-lg mb-2xl">
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} className="w-[47%] bg-card border border-border rounded-lg p-lg gap-sm">
          <Skeleton width={36} height={36} radius={18} />
          <Skeleton height={20} width="60%" />
          <Skeleton height={12} width="80%" />
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const { user, dealer } = useAuth();
  const summaryQuery = useDealerSummary();
  const productsQuery = useProducts({ pageSize: 20 });
  const colors = useThemeColors();

  const { summary } = summaryQuery;

  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data]);
  const offers = useMemo(
    () => products.filter((p) => discountPercent(p.price, p.mrp) !== null).slice(0, 10),
    [products]
  );
  const offerIds = useMemo(() => new Set(offers.map((p) => p.id)), [offers]);
  const recommended = useMemo(() => products.filter((p) => !offerIds.has(p.id)).slice(0, 10), [products, offerIds]);

  const isRefreshing = summaryQuery.isRefetching || productsQuery.isRefetching;
  const onRefresh = () => {
    HapticService.light();
    summaryQuery.refetch();
    productsQuery.refetch();
  };

  const goToOrders = () => router.push('/(tabs)/orders');
  const trackShipment = () =>
    summary.trackableOrderId ? router.push(`/order/${summary.trackableOrderId}/tracking`) : goToOrders();

  const quickActions: {
    icon: React.ComponentProps<typeof Feather>['name'];
    label: string;
    onPress: () => void;
  }[] = [
    { icon: 'search', label: 'Search Parts', onPress: () => router.push('/search') },
    { icon: 'truck', label: 'Track Shipment', onPress: trackShipment },
    { icon: 'file-text', label: 'Invoices', onPress: () => router.push('/invoices') },
    { icon: 'headphones', label: 'Support', onPress: () => WebBrowser.openBrowserAsync(`${webOrigin}/contact`) },
  ];

  const displayName = user?.name ?? dealer?.ownerName ?? 'Dealer';
  const greeting = greetingForHour(new Date().getHours());

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerClassName="pb-3xl"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <View className="flex-row items-center justify-between px-lg pt-sm pb-lg">
          <View className="flex-row items-center gap-md flex-1 pr-md">
            <Avatar name={displayName} size={48} />
            <View className="flex-1">
              <Text className="text-[12px] font-medium text-muted">{greeting}</Text>
              <Text className="text-h2 font-bold text-text" numberOfLines={1}>
                {displayName}
              </Text>
              {dealer?.companyName && (
                <Text className="text-[12px] text-muted" numberOfLines={1}>
                  {dealer.companyName}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Feather name="bell" size={22} color={colors.text} />
          </Pressable>
        </View>

        {dealer && (
          <View className="flex-row items-center justify-between mx-lg mb-lg p-md rounded-md bg-surface">
            <Badge label={dealer.status} tone={dealerStatusTone[dealer.status]} />
            <View className="items-end">
              <Text className="text-[11px] text-muted">Credit limit</Text>
              <Text className="text-[13px] font-semibold text-text">{formatCurrency(dealer.creditLimit)}</Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={() => router.push('/search')}
          className="mx-lg mb-2xl h-12 rounded-md bg-surface flex-row items-center px-md gap-sm"
          accessibilityRole="button"
          accessibilityLabel="Search parts, brands, part numbers"
        >
          <Feather name="search" size={18} color={colors.muted} />
          <Text className="text-[15px] text-muted">Search parts, brands, part numbers…</Text>
        </Pressable>

        {summaryQuery.isLoading ? (
          <StatGridSkeleton />
        ) : summaryQuery.isError ? (
          <View className="mx-lg mb-2xl p-lg rounded-lg bg-danger/10 gap-sm">
            <Text className="text-[13px] font-medium text-danger">Couldn&apos;t load your account summary.</Text>
            <Button label="Retry" size="sm" variant="outline" onPress={() => summaryQuery.refetch()} />
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-md px-lg mb-2xl">
            <StatCard
              icon="credit-card"
              label="Outstanding Balance"
              value={formatCurrency(summary.outstandingBalance)}
              warn={summary.outstandingBalance > 0}
              onPress={goToOrders}
            />
            <StatCard
              icon="truck"
              label="Orders in Transit"
              value={String(summary.ordersInTransit)}
              onPress={trackShipment}
            />
            <StatCard
              icon="clock"
              label="Processing"
              value={String(summary.processingOrders)}
              onPress={goToOrders}
            />
            <StatCard
              icon="alert-circle"
              label="Pending Payments"
              value={String(summary.pendingPaymentOrders)}
              warn={summary.pendingPaymentOrders > 0}
              onPress={goToOrders}
            />
          </View>
        )}

        <View className="flex-row px-lg mb-2xl gap-sm">
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                HapticService.light();
                action.onPress();
              }}
              className="flex-1 items-center gap-xs py-md rounded-md bg-surface active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View className="w-11 h-11 rounded-full bg-card items-center justify-center">
                <Feather name={action.icon} size={18} color={colors.primary} />
              </View>
              <Text className="text-[11px] font-medium text-text text-center" numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <BannerCarousel slides={PROMO_SLIDES} />

        {productsQuery.isLoading ? <ProductRailSkeleton title="Today's Offers" /> : <ProductRail title="Today's Offers" products={offers} />}

        {summaryQuery.isSuccess && summary.recentOrders.length > 0 && (
          <View className="gap-md mb-2xl">
            <View className="flex-row items-center justify-between px-lg">
              <Text className="text-h3 font-semibold text-text">Recent Activity</Text>
              <Pressable onPress={goToOrders} hitSlop={8} accessibilityRole="button" accessibilityLabel="View all orders">
                <Text className="text-[13px] font-semibold text-primary">View all</Text>
              </Pressable>
            </View>
            <View className="px-lg gap-sm">
              {summary.recentOrders.slice(0, 4).map((order) => (
                <Pressable
                  key={order.id}
                  onPress={() => router.push(`/order/${order.id}`)}
                  className="flex-row items-center justify-between p-md rounded-md bg-card border border-border active:bg-surface"
                  accessibilityRole="button"
                  accessibilityLabel={`Order ${order.orderNumber}, ${order.status}, ${formatCurrency(order.grandTotal)}`}
                >
                  <View className="gap-xxs flex-1 pr-md">
                    <Text className="text-[13px] font-semibold text-text">#{order.orderNumber}</Text>
                    <Text className="text-[11px] text-muted">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ·{' '}
                      {order.items.length} item(s)
                    </Text>
                  </View>
                  <View className="items-end gap-xxs">
                    <Text className="text-[13px] font-bold text-text">{formatCurrency(order.grandTotal)}</Text>
                    <Badge label={order.status} tone={orderStatusTone[order.status]} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <ProductRail title="Recently Ordered" products={summary.recentlyOrderedProducts} />

        {summary.lowStockProducts.length > 0 && (
          <View className="gap-md mb-2xl">
            <View className="flex-row items-center gap-sm px-lg">
              <Feather name="alert-triangle" size={16} color={colors.warning} />
              <Text className="text-h3 font-semibold text-text">Low Stock Alerts</Text>
            </View>
            <View className="px-lg gap-sm">
              {summary.lowStockProducts.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => router.push(`/product/${product.id}`)}
                  className="flex-row items-center justify-between p-md rounded-md bg-warning/10 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={`${product.name}, only ${product.stock} left`}
                >
                  <Text className="text-[13px] font-medium text-text flex-1 pr-md" numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text className="text-[12px] font-semibold text-warning">Only {product.stock} left</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {productsQuery.isLoading ? (
          <ProductRailSkeleton title="Recommended for You" />
        ) : (
          <ProductRail title="Recommended for You" products={recommended} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
