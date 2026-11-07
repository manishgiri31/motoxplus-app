import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct, useProducts } from '@/api/hooks/useProducts';
import { ProductGallery } from '@/components/ProductGallery';
import { usePulseAnimation } from '@/hooks/use-pulse-animation';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { ProductDetailSkeleton } from '@/src/components/catalog/ProductDetailSkeleton';
import {
  Button,
  EmptyState,
  ErrorState,
  FLOATING_NAV_HEIGHT,
  FloatingNavBar,
  GroupedList,
  ListRow,
  NavBarBackground,
  SegmentedControl,
  StatusBadge,
  Stepper,
  Toast,
  type SegmentedOption,
} from '@/src/components/ui';
import { colors, font, motion, screenPaddingX, sectionGap, textStyles } from '@/src/theme';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { groupCompatibility } from '@/utils/compatibility';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { isFewLeft, isOutOfStock, stockLabel } from '@/utils/stock';

type Tab = 'details' | 'compatible' | 'reviews';

const TABS: readonly SegmentedOption<Tab>[] = [
  { value: 'details', label: 'Details' },
  { value: 'compatible', label: 'Compatible' },
  { value: 'reviews', label: 'Reviews' },
];

const COLLAPSED_VEHICLE_COUNT = 6;

function SpecCapsule({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.capsule}>
      <Text style={styles.capsuleLabel} maxFontSizeMultiplier={1.2}>
        {label}
        <Text style={styles.capsuleValue}>{`  ${value}`}</Text>
      </Text>
    </View>
  );
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const productQuery = useProduct(id);
  const product = productQuery.data;
  const insets = useSafeAreaInsets();
  // The gallery is square, so scroll offsets that matter (nav bar going solid,
  // the name passing under it) are fractions of the screen width.
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const { user, dealer } = useAuth();
  const isDealerApproved = canAccessDealerApp(user, dealer);

  const addToCart = useAddToCart();
  const recordView = useRecentlyViewedStore((s) => s.recordView);
  const wishlisted = useWishlistStore((s) => (product ? s.isWishlisted(product.id) : false));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  // Re-adding while a toast is up restarts its 2.5s timer.
  const [toastKey, setToastKey] = useState(0);
  const [vehiclesExpanded, setVehiclesExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>('details');
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const heartPulse = usePulseAnimation();

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    if (product) {
      recordView(product.id);
      setQuantity(product.moq);
      navigation.setOptions({ title: product.name });
    }
  }, [product, navigation, recordView]);

  // "Related products" has no backend endpoint — this is an honest, derivable
  // stand-in: other products in the same category (see docs/api.md §4).
  const relatedQuery = useProducts({ category: product?.category.slug, pageSize: 8 });
  const related = (relatedQuery.data?.products ?? []).filter((p) => p.id !== product?.id).slice(0, 6);

  const navTop = insets.top + FLOATING_NAV_HEIGHT;

  if (productQuery.isLoading || !product) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {productQuery.isError ? (
          <View style={[styles.flex, { paddingTop: navTop }]}>
            <ErrorState error={productQuery.error} onRetry={() => productQuery.refetch()} />
          </View>
        ) : (
          <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
            <ProductDetailSkeleton topInset={navTop} />
          </ScrollView>
        )}
        <FloatingNavBar onBack={goBack} />
      </View>
    );
  }

  const outOfStock = isOutOfStock(product);
  const primaryImage = product.productImages?.find((i) => i.isPrimary) ?? product.productImages?.[0];
  const visibleVehicles = vehiclesExpanded ? product.compatibility : product.compatibility.slice(0, COLLAPSED_VEHICLE_COUNT);
  const showMrp = product.mrp != null && product.mrp > product.price;
  const addLabel = outOfStock
    ? 'Out of stock'
    : isDealerApproved
      ? `Add to cart · ${formatCurrency(product.price * quantity)}`
      : 'Add to cart';

  const handleAddToCart = () => {
    HapticService.light();
    addToCart.mutate(
      { payload: { productId: product.id, quantity }, product },
      {
        onSuccess: () => {
          setAddedMessage(`Added ${product.name} × ${quantity} to cart`);
          setToastKey((k) => k + 1);
        },
        onError: () => Alert.alert('Could not add to cart', 'Please try again.'),
      }
    );
  };

  const handleBuyNow = () => {
    HapticService.light();
    setAddedMessage(null);
    router.push('/checkout');
  };

  const handleShare = () => {
    Share.share({
      message: `${product.name} — ${product.brand} (Part #${product.partNumber}) on MotoXPlus`,
    });
  };

  const handleToggleWishlist = () => {
    HapticService.light();
    heartPulse.pulse();
    toggleWishlist({
      productId: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      imageUrl: primaryImage?.imageUrl ?? null,
      brand: product.brand,
    });
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomBarHeight + sectionGap }}
      >
        <ProductGallery images={product.productImages ?? []} topInset={navTop} />

        <View style={styles.header}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
            {product.category.name}
          </Text>
          <Text accessibilityRole="header" style={styles.name} maxFontSizeMultiplier={1.2}>
            {product.name}
          </Text>
          <Text style={styles.partNumber} maxFontSizeMultiplier={1.2}>{`Part #${product.partNumber}`}</Text>
        </View>

        <View style={styles.priceBlock}>
          {isDealerApproved ? (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.price} maxFontSizeMultiplier={1.2}>
                  {formatCurrency(product.price)}
                </Text>
                {showMrp && (
                  <Text style={styles.mrp} maxFontSizeMultiplier={1.2}>
                    {formatCurrency(product.mrp as number)}
                  </Text>
                )}
              </View>
              <Text style={styles.gstNote} maxFontSizeMultiplier={1.2}>{`Dealer price · GST ${product.gstRate}% extra`}</Text>
            </>
          ) : (
            <Button label="Login to see dealer price" variant="link" onPress={() => router.push('/(auth)/login')} />
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chipRow}
        >
          <StatusBadge label={stockLabel(product)} tone={outOfStock ? 'danger' : isFewLeft(product) ? 'warning' : 'success'} />
          {!!product.warranty && !/^no warranty$/i.test(product.warranty.trim()) && (
            <StatusBadge label={product.warranty} tone="neutral" />
          )}
          <SpecCapsule label="Part No." value={product.partNumber} />
          <SpecCapsule label="HSN" value={product.hsnCode} />
          <SpecCapsule label="MOQ" value={String(product.moq)} />
          <SpecCapsule label="GST" value={`${product.gstRate}%`} />
        </ScrollView>

        <View style={styles.tabs}>
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />

          <Animated.View key={tab} entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.fast).easing(motion.easing)}>
            {tab === 'details' &&
              (product.description ? (
                <Text style={styles.description} maxFontSizeMultiplier={1.2}>
                  {product.description}
                </Text>
              ) : (
                <Text style={styles.mutedLine} maxFontSizeMultiplier={1.2}>
                  No description available.
                </Text>
              ))}

            {tab === 'compatible' &&
              (product.compatibility.length > 0 ? (
                <View style={styles.compatible}>
                  {groupCompatibility(visibleVehicles).map((group, _, all) => (
                    <GroupedList key={group.brand ?? 'other'} header={group.brand ?? (all.length > 1 ? 'Other' : undefined)}>
                      {group.models.map((model, i) => (
                        <ListRow
                          key={`${model}-${i}`}
                          label={model}
                          accessibilityLabel={group.brand ? `${group.brand} ${model}` : model}
                        />
                      ))}
                    </GroupedList>
                  ))}
                  {product.compatibility.length > COLLAPSED_VEHICLE_COUNT && (
                    <Button
                      label={vehiclesExpanded ? 'Show less' : `Show all ${product.compatibility.length}`}
                      variant="link"
                      hideChevron
                      onPress={() => setVehiclesExpanded((v) => !v)}
                      style={styles.expand}
                    />
                  )}
                </View>
              ) : (
                <Text style={styles.mutedLine} maxFontSizeMultiplier={1.2}>
                  No compatible vehicles listed.
                </Text>
              ))}

            {tab === 'reviews' && <EmptyState icon="star" title="No reviews yet" style={styles.reviews} />}
          </Animated.View>
        </View>

        {related.length > 0 && (
          <View style={styles.related}>
            <Text accessibilityRole="header" style={styles.relatedTitle} maxFontSizeMultiplier={1.2}>{`More from ${product.category.name}`}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
              {related.map((p) => (
                <View key={p.id} style={styles.relatedItem}>
                  <CatalogProductCard product={p} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.ScrollView>

      <FloatingNavBar
        title={product.name}
        onBack={goBack}
        scrollY={scrollY}
        solidRange={[width * 0.4, width * 0.75]}
        titleRange={[width, width + 60]}
        actions={[
          { label: 'Share product', onPress: handleShare, icon: <Feather name="share" size={20} color={colors.ink} /> },
          {
            label: wishlisted ? 'Remove from wishlist' : 'Add to wishlist',
            onPress: handleToggleWishlist,
            selected: wishlisted,
            icon: (
              <Animated.View style={heartPulse.style}>
                <Ionicons name={wishlisted ? 'heart' : 'heart-outline'} size={22} color={colors.ink} />
              </Animated.View>
            ),
          },
        ]}
      />

      <View
        onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}
      >
        <NavBarBackground />
        <View style={styles.bottomHairline} />
        <Stepper value={quantity} moq={product.moq} onChange={setQuantity} disabled={outOfStock} label={product.name} />
        <Button
          label={addLabel}
          variant="primary"
          onPress={handleAddToCart}
          loading={addToCart.isPending}
          disabled={outOfStock}
          style={styles.addButton}
        />
      </View>

      {addedMessage && (
        <Toast
          key={toastKey}
          message={addedMessage}
          onHide={() => setAddedMessage(null)}
          action={{ label: 'Buy Now', onPress: handleBuyNow }}
          bottomOffset={bottomBarHeight + 12}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },

  header: { alignItems: 'center', gap: 4, paddingHorizontal: screenPaddingX, marginTop: 8 },
  eyebrow: { ...textStyles.caption, ...font(600), textAlign: 'center' },
  name: { ...textStyles.title, textAlign: 'center' },
  partNumber: { ...textStyles.callout, textAlign: 'center' },

  priceBlock: { alignItems: 'center', gap: 4, marginTop: 20, paddingHorizontal: screenPaddingX },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  price: { ...textStyles.title },
  mrp: { ...textStyles.callout, color: colors.ink3, textDecorationLine: 'line-through' },
  gstNote: { ...textStyles.caption },

  chipScroller: { marginTop: 20, flexGrow: 0 },
  // flexGrow + center: the row centers when it fits and scrolls when it doesn't.
  chipRow: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: screenPaddingX },
  capsule: { height: 28, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.bgAlt },
  capsuleLabel: { ...textStyles.caption },
  capsuleValue: { ...textStyles.caption, ...font(600), color: colors.ink },

  tabs: { marginTop: sectionGap, paddingHorizontal: screenPaddingX, gap: 20 },
  description: { ...textStyles.body, lineHeight: 25 },
  mutedLine: { ...textStyles.body, color: colors.ink2 },
  compatible: { gap: 20 },
  expand: { alignSelf: 'center' },
  reviews: { flex: 0, paddingVertical: 32 },

  related: { marginTop: sectionGap, gap: 16 },
  relatedTitle: { ...textStyles.cardTitle, paddingHorizontal: screenPaddingX },
  relatedRow: { paddingHorizontal: screenPaddingX, gap: 12 },
  relatedItem: { width: 180 },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: screenPaddingX,
    paddingTop: 12,
  },
  bottomHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  addButton: { flex: 1 },
});
