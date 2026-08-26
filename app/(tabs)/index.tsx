import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { memo, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, type BaseAnimationBuilder, type EntryExitAnimationFunction } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useDealerSummary } from '@/api/hooks/useDealerSummary';
import { useProducts } from '@/api/hooks/useProducts';
import type { Category, Product } from '@/api/types';
import { BannerCarousel, type BannerSlide } from '@/components/BannerCarousel';
import { webOrigin } from '@/config/env';
import { dealerStatusVariant } from '@/constants/dealerStatus';
import { orderStatusVariant } from '@/constants/orderStatus';
import { useAuth } from '@/auth/useAuth';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { CategoryCard } from '@/src/components/catalog/CategoryCard';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { Badge, Button, Skeleton, SkeletonProductCard } from '@/src/components/ui';
import { VehiclePickerCard } from '@/src/components/vehicle/VehiclePickerCard';
import { colors, fonts, radii } from '@/src/theme';
import { FREE_DELIVERY_THRESHOLD } from '@/utils/cartTotals';
import { discountPercent, formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

// Staggered fade-up entrance for the hero sections below, honoring reduce-motion
// by dropping the translateY (FadeInDown) in favor of a plain opacity fade.
function entrance(reduceMotion: boolean, delayMs: number): BaseAnimationBuilder | EntryExitAnimationFunction {
  return reduceMotion ? FadeIn.duration(200).delay(delayMs) : FadeInDown.duration(220).delay(delayMs);
}

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[avatarStyles.base, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[avatarStyles.label, { fontSize: size * 0.35 }]}>{initial}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  base: { backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.display.bold, color: '#FFFFFF' },
});

const CategoryGrid = memo(function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <View style={categoryStyles.section}>
      <Text style={categoryStyles.sectionTitle}>Browse by category</Text>
      <View style={categoryStyles.grid}>
        {categories.slice(0, 6).map((category) => (
          <View key={category.id} style={categoryStyles.cell}>
            <CategoryCard category={category} />
          </View>
        ))}
      </View>
    </View>
  );
});

const categoryStyles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink, paddingHorizontal: 16, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  cell: { width: '50%', padding: 4 },
});

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
    <View style={railStyles.section}>
      <Text style={railStyles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={railStyles.scrollContent}>
        {products.map((product) => (
          <View key={product.id} style={railStyles.cell}>
            <CatalogProductCard product={product} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

function ProductRailSkeleton({ title }: { title: string }) {
  return (
    <View style={railStyles.section}>
      <Text style={railStyles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={railStyles.scrollContent}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={railStyles.cell}>
            <SkeletonProductCard />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const railStyles = StyleSheet.create({
  section: { gap: 12, marginBottom: 24 },
  title: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink, paddingHorizontal: 16 },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  cell: { width: 160 },
});

interface StatCardProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  warn?: boolean;
  onPress?: () => void;
}

function StatCard({ icon, label, value, warn = false, onPress }: StatCardProps) {
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
      style={statStyles.card}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={statStyles.iconCircle}>
        <Feather name={icon} size={16} color={warn ? colors.red : colors.ink} />
      </View>
      <Text style={[statStyles.value, warn && statStyles.valueWarn]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={statStyles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatGridSkeleton() {
  return (
    <View style={statStyles.grid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={statStyles.card}>
          <Skeleton width={36} height={36} radius={18} />
          <Skeleton height={20} width="60%" />
          <Skeleton height={12} width="80%" />
        </View>
      ))}
    </View>
  );
}

const statStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginBottom: 24 },
  card: {
    width: '47%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: 16,
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: fonts.display.bold, fontSize: 19, color: colors.ink },
  valueWarn: { color: colors.red },
  label: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
});

export default function HomeScreen() {
  const { user, dealer } = useAuth();
  const summaryQuery = useDealerSummary();
  const productsQuery = useProducts({ pageSize: 20 });
  const categoriesQuery = useCategories();
  const reduceMotion = useReduceMotion();

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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={displayName} size={48} />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {dealer?.companyName && (
                <Text style={styles.company} numberOfLines={1}>
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
            <Feather name="bell" size={22} color={colors.ink} />
          </Pressable>
        </View>

        {dealer && (
          <View style={styles.dealerRow}>
            <Badge label={dealer.status} variant={dealerStatusVariant[dealer.status]} />
            <View style={styles.creditBlock}>
              <Text style={styles.creditLabel}>Credit limit</Text>
              <Text style={styles.creditValue}>{formatCurrency(dealer.creditLimit)}</Text>
            </View>
          </View>
        )}

        <Animated.View entering={entrance(reduceMotion, 0)}>
          <Pressable
            onPress={() => router.push('/search')}
            style={styles.searchBar}
            accessibilityRole="button"
            accessibilityLabel="Search parts, brands, part numbers"
          >
            <Feather name="search" size={18} color={colors.muted} />
            <Text style={styles.searchPlaceholder}>Search parts, brands, part numbers…</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={entrance(reduceMotion, 80)} style={styles.vehicleCardWrap}>
          <VehiclePickerCard />
        </Animated.View>

        <Animated.View entering={entrance(reduceMotion, 160)}>
          <CategoryGrid categories={categoriesQuery.data ?? []} />
        </Animated.View>

        {summaryQuery.isLoading ? (
          <StatGridSkeleton />
        ) : summaryQuery.isError ? (
          <View style={styles.summaryError}>
            <Text style={styles.summaryErrorText}>Couldn&apos;t load your account summary.</Text>
            <Button label="Retry" variant="ghost" onPress={() => summaryQuery.refetch()} />
          </View>
        ) : (
          <View style={statStyles.grid}>
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

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                HapticService.light();
                action.onPress();
              }}
              style={styles.quickAction}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={styles.quickActionIcon}>
                <Feather name={action.icon} size={18} color={colors.red} />
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <BannerCarousel slides={PROMO_SLIDES} />

        {productsQuery.isLoading ? <ProductRailSkeleton title="Today's Offers" /> : <ProductRail title="Today's Offers" products={offers} />}

        {summaryQuery.isSuccess && summary.recentOrders.length > 0 && (
          <View style={styles.listSection}>
            <View style={styles.listSectionHeader}>
              <Text style={styles.listSectionTitle}>Recent Activity</Text>
              <Pressable onPress={goToOrders} hitSlop={8} accessibilityRole="button" accessibilityLabel="View all orders">
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            <View style={styles.listSectionBody}>
              {summary.recentOrders.slice(0, 4).map((order) => (
                <Pressable
                  key={order.id}
                  onPress={() => router.push(`/order/${order.id}`)}
                  style={styles.orderRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Order ${order.orderNumber}, ${order.status}, ${formatCurrency(order.grandTotal)}`}
                >
                  <View style={styles.orderRowLeft}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <Text style={styles.orderMeta}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ·{' '}
                      {order.items.length} item(s)
                    </Text>
                  </View>
                  <View style={styles.orderRowRight}>
                    <Text style={styles.orderTotal}>{formatCurrency(order.grandTotal)}</Text>
                    <Badge label={order.status} variant={orderStatusVariant[order.status]} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <ProductRail title="Recently Ordered" products={summary.recentlyOrderedProducts} />

        {summary.lowStockProducts.length > 0 && (
          <View style={styles.listSection}>
            <View style={styles.lowStockHeader}>
              <Feather name="alert-triangle" size={16} color={colors.red} />
              <Text style={styles.listSectionTitle}>Low Stock Alerts</Text>
            </View>
            <View style={styles.listSectionBody}>
              {summary.lowStockProducts.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => router.push(`/product/${product.id}`)}
                  style={styles.lowStockRow}
                  accessibilityRole="button"
                  accessibilityLabel={`${product.name}, only ${product.stock} left`}
                >
                  <Text style={styles.lowStockName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.lowStockCount}>Only {product.stock} left</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 },
  headerText: { flex: 1 },
  greeting: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.muted },
  name: { fontFamily: fonts.display.bold, fontSize: 22, color: colors.ink },
  company: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  dealerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  creditBlock: { alignItems: 'flex-end' },
  creditLabel: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.muted },
  creditValue: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.ink },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 24,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchPlaceholder: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.muted },
  vehicleCardWrap: { paddingHorizontal: 16, marginBottom: 24 },
  summaryError: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.redSoft,
    gap: 8,
  },
  summaryErrorText: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.red },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 24, gap: 8 },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontFamily: fonts.body.medium, fontSize: 11, color: colors.ink, textAlign: 'center' },
  listSection: { gap: 12, marginBottom: 24 },
  listSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  listSectionTitle: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink },
  viewAll: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.red },
  listSectionBody: { paddingHorizontal: 16, gap: 8 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  orderRowLeft: { flex: 1, paddingRight: 12, gap: 2 },
  orderNumber: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.ink },
  orderMeta: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.muted },
  orderRowRight: { alignItems: 'flex-end', gap: 2 },
  orderTotal: { fontFamily: fonts.display.bold, fontSize: 13, color: colors.ink },
  lowStockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.redSoft,
  },
  lowStockName: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.ink, flex: 1, paddingRight: 12 },
  lowStockCount: { fontFamily: fonts.body.semiBold, fontSize: 12, color: colors.red },
});
