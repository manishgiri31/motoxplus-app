import Feather from '@expo/vector-icons/Feather';
import { Stack, useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct, useProducts } from '@/api/hooks/useProducts';
import { ProductGallery } from '@/components/ProductGallery';
import { BadgeCheck } from '@/components/icons/BadgeCheck';
import { Heart } from '@/components/icons/Heart';
import { MapPin } from '@/components/icons/MapPin';
import { RotateCcw } from '@/components/icons/RotateCcw';
import { Truck } from '@/components/icons/Truck';
import type { IconProps } from '@/components/icons/types';
import { usePulseAnimation } from '@/hooks/use-pulse-animation';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { FilledHeart } from '@/src/components/account/FilledHeart';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { ProductDetailSkeleton } from '@/src/components/catalog/ProductDetailSkeleton';
import { ProductPrice } from '@/src/components/catalog/ProductPrice';
import { PincodeServiceability } from '@/src/components/checkout/PincodeServiceability';
import {
  Button,
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
import { colors, font, motion, screenPaddingX, space, textStyles } from '@/src/theme';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { FREE_DELIVERY_THRESHOLD } from '@/utils/cartTotals';
import { groupCompatibility } from '@/utils/compatibility';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { isFewLeft, isOutOfStock, stockLabel } from '@/utils/stock';

type Tab = 'details' | 'compatible';

const TABS: readonly SegmentedOption<Tab>[] = [
  { value: 'details', label: 'Description' },
  { value: 'compatible', label: 'Compatible vehicles' },
];

const COLLAPSED_VEHICLE_COUNT = 6;

function hasWarranty(warranty: string | null | undefined): warranty is string {
  return !!warranty && !/^no warranty$/i.test(warranty.trim());
}

// White block on the grey page; blocks are separated by the grey between them.
function Block({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      {!!title && (
        <Text accessibilityRole="header" style={styles.blockTitle} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

// One line of the delivery block: a small icon and a sentence.
function InfoLine({ icon: Icon, children }: { icon: ComponentType<IconProps>; children: ReactNode }) {
  return (
    <View style={styles.infoLine}>
      <View style={styles.infoIcon}>
        <Icon size={18} color={colors.ink2} />
      </View>
      <View style={styles.infoText}>{children}</View>
    </View>
  );
}

// Specifications table: label column on the left, value on the right, hairlines between rows.
function SpecRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.specRow, !last && styles.specDivider]} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={styles.specLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <Text selectable style={styles.specValue} maxFontSizeMultiplier={1.2}>
        {value}
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
  const [buying, setBuying] = useState(false);
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
  const warranty = hasWarranty(product.warranty) ? product.warranty : null;
  const deliverTo = [dealer?.city, dealer?.pincode].filter(Boolean).join(' ');

  const specs = [
    { label: 'Brand', value: product.brand },
    { label: 'Part number', value: product.partNumber },
    product.oemNumber ? { label: 'OEM number', value: product.oemNumber } : null,
    { label: 'Category', value: product.category.name },
    { label: 'HSN code', value: product.hsnCode },
    { label: 'GST', value: `${product.gstRate}%` },
    { label: 'Minimum order', value: `${product.moq} ${product.moq === 1 ? 'piece' : 'pieces'}` },
    { label: 'Warranty', value: warranty ?? 'No warranty' },
    product.countryOfOrigin ? { label: 'Country of origin', value: product.countryOfOrigin } : null,
  ].filter((s): s is { label: string; value: string } => !!s?.value);

  const add = (then?: () => void) => {
    HapticService.light();
    addToCart.mutate(
      { payload: { productId: product.id, quantity }, product },
      {
        onSuccess: () => {
          if (then) {
            then();
            return;
          }
          setAddedMessage(`Added ${product.name} × ${quantity} to cart`);
          setToastKey((k) => k + 1);
        },
        onError: () => Alert.alert('Could not add to cart', 'Please try again.'),
        onSettled: () => setBuying(false),
      }
    );
  };

  const handleBuyNow = () => {
    setBuying(true);
    setAddedMessage(null);
    add(() => router.push('/checkout'));
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
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomBarHeight + space.lg, gap: space.sm }}
      >
        {/* Photos, then the title and price on one white block. */}
        <View style={styles.hero}>
          <ProductGallery images={product.productImages ?? []} topInset={navTop} />

          <View style={styles.summary}>
            <Pressable
              onPress={() => router.push(`/category/${product.category.slug}`)}
              accessibilityRole="link"
              accessibilityLabel={`More in ${product.category.name}`}
              hitSlop={8}
              style={styles.categoryLink}
            >
              <Text style={styles.categoryText} maxFontSizeMultiplier={1.2}>
                {product.category.name}
              </Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.name} maxFontSizeMultiplier={1.2}>
              {product.name}
            </Text>
            <Text style={styles.byline} maxFontSizeMultiplier={1.2}>
              {`${product.brand} · Part #${product.partNumber}`}
            </Text>

            <View style={styles.badges}>
              <StatusBadge label={stockLabel(product)} tone={outOfStock ? 'danger' : isFewLeft(product) ? 'warning' : 'success'} />
              {warranty && <StatusBadge label={`${warranty} warranty`} tone="neutral" />}
            </View>

            <View style={styles.priceBlock}>
              <ProductPrice price={product.price} mrp={product.mrp} isDealerApproved={isDealerApproved} size="detail" />
              {isDealerApproved && (
                <Text style={styles.gstNote} maxFontSizeMultiplier={1.2}>
                  {`Dealer price · + GST ${product.gstRate}%`}
                </Text>
              )}
            </View>

            {!outOfStock && (
              <View style={styles.quantityRow}>
                <View style={styles.quantityText}>
                  <Text style={styles.quantityLabel} maxFontSizeMultiplier={1.2}>
                    Quantity
                  </Text>
                  {product.moq > 1 && (
                    <Text style={styles.quantityHint} maxFontSizeMultiplier={1.2}>
                      {`Sold in multiples of ${product.moq}`}
                    </Text>
                  )}
                </View>
                <Stepper value={quantity} moq={product.moq} onChange={setQuantity} label={product.name} />
              </View>
            )}
          </View>
        </View>

        <Block title="Delivery & services">
          <View style={styles.infoList}>
            <InfoLine icon={MapPin}>
              <Text style={styles.infoMain} maxFontSizeMultiplier={1.2}>
                {'Deliver to '}
                <Text style={styles.infoStrong}>{deliverTo || 'your registered address'}</Text>
              </Text>
              {!!dealer?.pincode && <PincodeServiceability pincode={dealer.pincode} inline />}
            </InfoLine>
            <InfoLine icon={Truck}>
              <Text style={styles.infoMain} maxFontSizeMultiplier={1.2}>
                {`Free delivery on orders over ${formatCurrency(FREE_DELIVERY_THRESHOLD)}`}
              </Text>
            </InfoLine>
            {warranty && (
              <InfoLine icon={BadgeCheck}>
                <Text style={styles.infoMain} maxFontSizeMultiplier={1.2}>
                  {`${warranty} warranty`}
                </Text>
              </InfoLine>
            )}
            <InfoLine icon={RotateCcw}>
              <Text style={styles.infoMain} maxFontSizeMultiplier={1.2}>
                Cancellable before dispatch (2% charge)
              </Text>
            </InfoLine>
          </View>
        </Block>

        <Block title="Specifications">
          <View style={styles.specTable}>
            {specs.map((s, i) => (
              <SpecRow key={s.label} label={s.label} value={s.value} last={i === specs.length - 1} />
            ))}
          </View>
        </Block>

        <Block>
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
          </Animated.View>
        </Block>

        {related.length > 0 && (
          <View style={styles.relatedBlock}>
            <Text accessibilityRole="header" style={[styles.blockTitle, styles.relatedTitle]} maxFontSizeMultiplier={1.2}>
              {`Similar parts in ${product.category.name}`}
            </Text>
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
                {wishlisted ? <FilledHeart size={22} color={colors.accent} /> : <Heart size={22} color={colors.ink} />}
              </Animated.View>
            ),
          },
        ]}
      />

      {/* Marketplace bottom bar: Add to cart and Buy now side by side. */}
      <View
        onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}
      >
        <NavBarBackground />
        <View style={styles.bottomHairline} />
        {outOfStock ? (
          <Button label="Out of stock" variant="primary" disabled fullWidth />
        ) : (
          <>
            <Button
              label="Add to cart"
              variant="neutral"
              onPress={() => add()}
              loading={addToCart.isPending && !buying}
              disabled={buying}
              accessibilityLabel={`Add ${quantity} to cart`}
              style={styles.barButton}
            />
            <Button
              label="Buy now"
              variant="primary"
              onPress={handleBuyNow}
              loading={buying}
              disabled={addToCart.isPending && !buying}
              accessibilityLabel={`Buy ${quantity} now${isDealerApproved ? `, ${formatCurrency(product.price * quantity)}` : ''}`}
              style={styles.barButton}
            />
          </>
        )}
      </View>

      {addedMessage && (
        <Toast
          key={toastKey}
          message={addedMessage}
          onHide={() => setAddedMessage(null)}
          action={{ label: 'View cart', onPress: () => router.push('/(tabs)/cart') }}
          bottomOffset={bottomBarHeight + 12}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { backgroundColor: colors.bgAlt },

  hero: { backgroundColor: colors.white, paddingBottom: space.lg },
  summary: { paddingHorizontal: screenPaddingX, paddingTop: space.sm, gap: space.xs },
  categoryLink: { alignSelf: 'flex-start' },
  categoryText: { ...font(600), fontSize: 14, lineHeight: 20, color: colors.link },
  name: { ...font(500), fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.ink },
  byline: { ...textStyles.callout },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  priceBlock: { marginTop: space.md, gap: 2 },
  gstNote: { ...textStyles.caption },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  quantityText: { flex: 1, gap: 2 },
  quantityLabel: { ...textStyles.headline },
  quantityHint: { ...textStyles.caption },

  block: { backgroundColor: colors.white, paddingHorizontal: screenPaddingX, paddingVertical: space.lg, gap: space.md },
  blockTitle: { ...font(700), fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: colors.ink },

  infoList: { gap: space.md },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  infoIcon: { width: 22, paddingTop: 1, alignItems: 'center' },
  infoText: { flex: 1, gap: 2 },
  infoMain: { ...font(400), fontSize: 15, lineHeight: 20, color: colors.ink },
  infoStrong: { ...font(600) },

  specTable: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: 'hidden' },
  specRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.md, paddingVertical: 10 },
  specDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft },
  specLabel: { width: '40%', ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  specValue: { flex: 1, ...font(500), fontSize: 14, lineHeight: 20, color: colors.ink },

  description: { ...textStyles.body, lineHeight: 25 },
  mutedLine: { ...textStyles.body, color: colors.ink2 },
  compatible: { gap: 20 },
  expand: { alignSelf: 'center' },

  relatedBlock: { backgroundColor: colors.white, paddingVertical: space.lg, gap: space.md },
  relatedTitle: { paddingHorizontal: screenPaddingX },
  relatedRow: { paddingHorizontal: screenPaddingX, gap: 12 },
  relatedItem: { width: 160 },

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
  barButton: { flex: 1, paddingHorizontal: space.md },
});
