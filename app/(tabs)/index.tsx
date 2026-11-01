import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useDealerSummary } from '@/api/hooks/useDealerSummary';
import { useProducts } from '@/api/hooks/useProducts';
import { useAuth } from '@/auth/useAuth';
import { BannerCarousel, type BannerSlide } from '@/components/BannerCarousel';
import { dealerStatusBadgeTone, dealerStatusLabel } from '@/constants/dealerStatus';
import { CategoryRail, CategoryRailSkeleton } from '@/src/components/catalog/CategoryRail';
import { MoreSection } from '@/src/components/home/MoreSection';
import { NotificationBell } from '@/src/components/home/NotificationBell';
import { ProductRail } from '@/src/components/home/ProductRail';
import { QuickActions } from '@/src/components/home/QuickActions';
import { SearchPill } from '@/src/components/home/SearchPill';
import { SearchSheet } from '@/src/components/home/SearchSheet';
import { SectionError } from '@/src/components/home/SectionError';
import { SectionHeader } from '@/src/components/home/SectionHeader';
import { StatGrid } from '@/src/components/home/StatGrid';
import { CompactTitleBar, LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { VehiclePickerCard } from '@/src/components/vehicle/VehiclePickerCard';
import { colors, sectionGap, space, textStyles } from '@/src/theme';
import { FREE_DELIVERY_THRESHOLD } from '@/utils/cartTotals';
import { discountPercent, formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

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

// Matches CompactTitleBar's height: the slot above the large title where the bell sits.
const NAV_BAR_HEIGHT = 44;

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user, dealer } = useAuth();
  const insets = useSafeAreaInsets();
  const summaryQuery = useDealerSummary();
  const productsQuery = useProducts({ pageSize: 20 });
  const categoriesQuery = useCategories();
  const { scrollY, onScroll } = useLargeTitleScroll();

  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { summary } = summaryQuery;

  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data]);
  const offers = useMemo(
    () => products.filter((p) => discountPercent(p.price, p.mrp) !== null).slice(0, 10),
    [products]
  );
  const offerIds = useMemo(() => new Set(offers.map((p) => p.id)), [offers]);
  const recommended = useMemo(() => products.filter((p) => !offerIds.has(p.id)).slice(0, 10), [products, offerIds]);

  // A manual pull spins the indicator until all three queries settle; background
  // refetches don't.
  const onRefresh = async () => {
    HapticService.light();
    setRefreshing(true);
    await Promise.allSettled([summaryQuery.refetch(), productsQuery.refetch(), categoriesQuery.refetch()]);
    setRefreshing(false);
  };

  const goToOrders = () => router.push('/(tabs)/orders');
  const trackShipment = () =>
    summary.trackableOrderId ? router.push(`/order/${summary.trackableOrderId}/tracking`) : goToOrders();

  const displayName = user?.name ?? dealer?.ownerName ?? 'Dealer';
  const greeting = greetingForHour(new Date().getHours());
  const categories = categoriesQuery.data ?? [];
  const navBarHeight = insets.top + NAV_BAR_HEIGHT;

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: navBarHeight, paddingBottom: sectionGap + space.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink3}
            colors={[colors.ink3]}
            progressViewOffset={navBarHeight}
          />
        }
      >
        <LargeTitleHeader
          eyebrow={greeting}
          title={displayName}
          subtitle={dealer?.companyName}
          subtitleSize="small"
          numberOfLines={1}
          scrollY={scrollY}
        >
          {dealer && (
            <View style={styles.statusLine}>
              <StatusBadge label={dealerStatusLabel[dealer.status]} tone={dealerStatusBadgeTone[dealer.status]} />
              <Text style={styles.credit} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                Credit limit {formatCurrency(dealer.creditLimit)}
              </Text>
            </View>
          )}
        </LargeTitleHeader>

        <View style={styles.sections}>
          <SearchPill onPress={() => setSearchOpen(true)} />

          <VehiclePickerCard />

          {(categoriesQuery.isLoading || categoriesQuery.isError || categories.length > 0) && (
            <View style={styles.section}>
              <SectionHeader
                title="Shop by category"
                onSeeAll={categories.length > 0 ? () => router.push('/(tabs)/categories') : undefined}
              />
              {categoriesQuery.isLoading ? (
                <CategoryRailSkeleton />
              ) : categoriesQuery.isError ? (
                <SectionError what="categories" onRetry={() => categoriesQuery.refetch()} />
              ) : (
                <CategoryRail categories={categories.slice(0, 12)} />
              )}
            </View>
          )}

          <StatGrid
            loading={summaryQuery.isLoading}
            error={summaryQuery.isError}
            onRetry={() => summaryQuery.refetch()}
            outstanding={formatCurrency(summary.outstandingBalance)}
            outstandingDue={summary.outstandingBalance > 0}
            inTransit={summary.ordersInTransit}
            processing={summary.processingOrders}
            pendingPayments={summary.pendingPaymentOrders}
            onOutstanding={goToOrders}
            onInTransit={trackShipment}
            onProcessing={goToOrders}
            onPendingPayments={goToOrders}
          />

          <QuickActions
            onSearch={() => setSearchOpen(true)}
            onTrack={trackShipment}
            onInvoices={() => router.push('/invoices')}
            onSupport={() => router.push('/contact')}
          />

          <BannerCarousel slides={PROMO_SLIDES} />

          <ProductRail
            title="Today's Offers"
            products={offers}
            loading={productsQuery.isLoading}
            error={productsQuery.isError}
            onRetry={() => productsQuery.refetch()}
          />

          <ProductRail
            title="Recently Ordered"
            products={summary.recentlyOrderedProducts}
            loading={summaryQuery.isLoading}
            error={summaryQuery.isError}
            onRetry={() => summaryQuery.refetch()}
            onSeeAll={goToOrders}
          />

          <ProductRail
            title="Low Stock"
            products={summary.lowStockProducts}
            loading={summaryQuery.isLoading}
            error={summaryQuery.isError}
            onRetry={() => summaryQuery.refetch()}
            stockBadge
          />

          <MoreSection recentOrders={summary.recentOrders.slice(0, 5)} recommended={recommended} />
        </View>
      </Animated.ScrollView>

      <CompactTitleBar title={displayName} scrollY={scrollY} />
      <View style={[styles.bell, { top: insets.top }]}>
        <NotificationBell onPress={() => router.push('/notifications')} />
      </View>

      <SearchSheet visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  sections: { paddingTop: space.lg, gap: sectionGap },
  section: { gap: 4 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  credit: { flexShrink: 1, ...textStyles.callout },
  // Sits in the nav-bar slot above the large title, over the compact bar too.
  bell: { position: 'absolute', right: space.sm, zIndex: 2 },
});
