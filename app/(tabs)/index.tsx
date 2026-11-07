import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useDealerSummary } from '@/api/hooks/useDealerSummary';
import { useProducts } from '@/api/hooks/useProducts';
import type { Product } from '@/api/types';
import { useAuth } from '@/auth/useAuth';
import { BannerCarousel, type BannerSlide } from '@/components/BannerCarousel';
import { ChevronRight } from '@/components/icons/ChevronRight';
import { MapPin } from '@/components/icons/MapPin';
import { dealerStatusBadgeTone, dealerStatusLabel } from '@/constants/dealerStatus';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { CategoryRail, CategoryRailSkeleton } from '@/src/components/catalog/CategoryRail';
import { MoreSection } from '@/src/components/home/MoreSection';
import { NotificationBell } from '@/src/components/home/NotificationBell';
import { ProductRail } from '@/src/components/home/ProductRail';
import { QuickActions } from '@/src/components/home/QuickActions';
import { SearchPill } from '@/src/components/home/SearchPill';
import { SectionError } from '@/src/components/home/SectionError';
import { SectionHeader } from '@/src/components/home/SectionHeader';
import { StatGrid } from '@/src/components/home/StatGrid';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { VehiclePickerCard } from '@/src/components/vehicle/VehiclePickerCard';
import { alpha, colors, font, screenPaddingX, space, textStyles } from '@/src/theme';
import { FREE_DELIVERY_THRESHOLD } from '@/utils/cartTotals';
import { discountPercent, formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

// No banner API exists on the backend — these are static, client-side
// promo slides. Module-level so BannerCarousel's props stay referentially
// stable across renders.
const PROMO_SLIDES: BannerSlide[] = [
  {
    id: 'genuine-parts',
    tone: 'brand',
    eyebrow: 'Genuine parts, direct to dealer',
    title: 'Order in minutes,\ndelivered nationwide.',
    cta: 'Shop now',
    onPress: () => router.push('/(tabs)/categories'),
  },
  {
    id: 'free-delivery',
    tone: 'dark',
    eyebrow: 'Free delivery',
    title: `Free shipping on orders\nover ${formatCurrency(FREE_DELIVERY_THRESHOLD)}.`,
    cta: 'View cart',
    onPress: () => router.push('/(tabs)/cart'),
  },
  {
    id: 'new-arrivals',
    tone: 'brand',
    eyebrow: 'New this week',
    title: 'Fresh stock added\nevery week.',
    cta: 'Browse parts',
    onPress: () => router.push('/(tabs)/categories'),
  },
];

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// A rail renders nothing once loaded with no products; skip its white block too.
function railVisible(products: Product[], loading: boolean, error: boolean) {
  return loading || error || products.length > 0;
}

// White content block on the grey page, the marketplace layout: blocks are
// separated by the grey showing through.
function Block({ children }: { children: ReactNode }) {
  return <View style={styles.block}>{children}</View>;
}

export default function HomeScreen() {
  const { user, dealer } = useAuth();
  const insets = useSafeAreaInsets();
  const summaryQuery = useDealerSummary();
  const productsQuery = useProducts({ pageSize: 20 });
  const categoriesQuery = useCategories();
  useLightStatusBar();

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
  // Opens the Orders tab on its Active filter. The timestamp makes a repeat tap
  // re-apply the filter even if the dealer switched it in between.
  const goToActiveOrders = () =>
    router.push({ pathname: '/(tabs)/orders', params: { filter: 'active', at: String(Date.now()) } });
  const trackShipment = () =>
    summary.trackableOrderId ? router.push(`/order/${summary.trackableOrderId}/tracking`) : goToActiveOrders();
  // One order in transit / awaiting payment: open it. Several: list them.
  const openInTransit = () => (summary.ordersInTransit === 1 ? trackShipment() : goToActiveOrders());
  const openPendingPayments = () =>
    summary.pendingPaymentOrders === 1 && summary.paymentDueOrderId
      ? router.push(`/order/${summary.paymentDueOrderId}`)
      : goToActiveOrders();

  const displayName = user?.name ?? dealer?.ownerName ?? 'Dealer';
  const greeting = greetingForHour(new Date().getHours());
  const categories = categoriesQuery.data ?? [];
  const deliverTo = [dealer?.city, dealer?.pincode].filter(Boolean).join(' ');

  return (
    <View style={styles.screen}>
      {/* Red behind the status bar; the header below continues it. */}
      <View style={[styles.statusBand, { height: insets.top }]} />

      <Animated.ScrollView
        // The search band (child 1) pins under the status bar once the
        // greeting has scrolled away, like a marketplace app's search.
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.white}
            colors={[colors.accent]}
          />
        }
      >
        {/* 0 — greeting and bell */}
        <View style={styles.headerTop}>
          {/* Keeps the pull-down overscroll red instead of grey. */}
          <View style={styles.overscroll} />
          <View style={styles.greetText}>
            <Text style={styles.greet} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {`${greeting},`}
            </Text>
            <Text accessibilityRole="header" style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {displayName}
            </Text>
          </View>
          <NotificationBell color={colors.white} onPress={() => router.push('/notifications')} />
        </View>

        {/* 1 — sticky search band */}
        <View style={styles.searchBand}>
          <SearchPill tone="onAccent" onPress={() => router.push('/search')} />
        </View>

        {/* 2 — deliver-to strip */}
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel={`Deliver to ${dealer?.companyName ?? displayName}${deliverTo ? `, ${deliverTo}` : ''}. Opens your profile.`}
          style={({ pressed }) => [styles.deliver, pressed && styles.pressed]}
        >
          <MapPin size={16} color={colors.white} />
          <Text style={styles.deliverText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {'Deliver to '}
            <Text style={styles.deliverStrong}>{dealer?.companyName ?? displayName}</Text>
            {deliverTo ? ` · ${deliverTo}` : ''}
          </Text>
          <ChevronRight size={16} color={colors.white} />
        </Pressable>

        {/* 3 — content blocks */}
        <View style={styles.blocks}>
          {(categoriesQuery.isLoading || categoriesQuery.isError || categories.length > 0) && (
            <Block>
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
            </Block>
          )}

          <Block>
            <BannerCarousel slides={PROMO_SLIDES} />
          </Block>

          {railVisible(offers, productsQuery.isLoading, productsQuery.isError) && (
            <Block>
              <ProductRail
                title="Today's offers"
                products={offers}
                loading={productsQuery.isLoading}
                error={productsQuery.isError}
                onRetry={() => productsQuery.refetch()}
              />
            </Block>
          )}

          <Block>
            <VehiclePickerCard />
          </Block>

          <Block>
            <View style={styles.accountHead}>
              <SectionHeader title="Your account" />
              {dealer && (
                <View style={styles.statusLine}>
                  <StatusBadge label={dealerStatusLabel[dealer.status]} tone={dealerStatusBadgeTone[dealer.status]} />
                  <Text style={styles.credit} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                    {`Credit limit ${formatCurrency(dealer.creditLimit)}`}
                  </Text>
                </View>
              )}
            </View>
            <StatGrid
              loading={summaryQuery.isLoading}
              error={summaryQuery.isError}
              onRetry={() => summaryQuery.refetch()}
              outstanding={formatCurrency(summary.outstandingBalance)}
              outstandingDue={summary.outstandingBalance > 0}
              inTransit={summary.ordersInTransit}
              processing={summary.processingOrders}
              pendingPayments={summary.pendingPaymentOrders}
              onOutstanding={goToActiveOrders}
              onInTransit={openInTransit}
              onProcessing={goToActiveOrders}
              onPendingPayments={openPendingPayments}
            />
            <View style={styles.actions}>
              <QuickActions
                onWishlist={() => router.push('/wishlist')}
                onTrack={trackShipment}
                onInvoices={() => router.push('/invoices')}
                onSupport={() => router.push('/contact')}
              />
            </View>
          </Block>

          {railVisible(summary.recentlyOrderedProducts, summaryQuery.isLoading, summaryQuery.isError) && (
            <Block>
              <ProductRail
                title="Buy again"
                products={summary.recentlyOrderedProducts}
                loading={summaryQuery.isLoading}
                error={summaryQuery.isError}
                onRetry={() => summaryQuery.refetch()}
                onSeeAll={goToOrders}
              />
            </Block>
          )}

          {railVisible(summary.lowStockProducts, summaryQuery.isLoading, summaryQuery.isError) && (
            <Block>
              <ProductRail
                title="Running low"
                products={summary.lowStockProducts}
                loading={summaryQuery.isLoading}
                error={summaryQuery.isError}
                onRetry={() => summaryQuery.refetch()}
                stockBadge
              />
            </Block>
          )}

          <Block>
            <MoreSection recentOrders={summary.recentOrders.slice(0, 5)} recommended={recommended} />
          </Block>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.accent },
  statusBand: { backgroundColor: colors.accent },
  scroll: { flex: 1, backgroundColor: colors.bgAlt },
  content: { paddingBottom: space.xxl },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: screenPaddingX,
    paddingRight: space.sm,
    paddingTop: space.sm,
    backgroundColor: colors.accent,
  },
  overscroll: { position: 'absolute', left: 0, right: 0, top: -600, height: 600, backgroundColor: colors.accent },
  greetText: { flex: 1 },
  greet: { ...font(400), fontSize: 14, lineHeight: 18, color: alpha(colors.white, 0.85) },
  name: { ...font(700), fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: colors.white },

  searchBand: { paddingHorizontal: screenPaddingX, paddingTop: space.sm, paddingBottom: space.md, backgroundColor: colors.accent },

  deliver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: screenPaddingX,
    backgroundColor: colors.accentActive,
  },
  deliverText: { flex: 1, ...font(400), fontSize: 13, lineHeight: 18, color: alpha(colors.white, 0.9) },
  deliverStrong: { ...font(600), color: colors.white },
  pressed: { opacity: 0.8 },

  blocks: { gap: space.sm, paddingTop: space.sm },
  block: { backgroundColor: colors.white, paddingVertical: space.lg, gap: space.sm },

  accountHead: { gap: 2 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: screenPaddingX, marginBottom: space.sm },
  credit: { flexShrink: 1, ...textStyles.callout },
  actions: { marginTop: space.md },
});
