import Feather from '@expo/vector-icons/Feather';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Product } from '@/api/types';
import { Settings2 } from '@/components/icons/Settings2';
import { useGridColumns } from '@/hooks/use-grid-columns';
import type { SelectedVehicle } from '@/stores/vehicleStore';
import { colors, layout, screenPaddingX, textStyles } from '@/src/theme';

import { Button } from '../ui/Button';
import { LargeTitleHeader } from '../ui/LargeTitleHeader';
import { NavBarBackground } from '../ui/NavBarBackground';
import { SearchBar } from '../ui/SearchBar';
import { CatalogProductCard } from './CatalogProductCard';
import { ProductTileSkeleton } from './CatalogSkeletons';

const GRID_GAP = 12;
const SEARCH_BAR_HEIGHT = 60; // 44pt field + 8pt above and below
const MAX_FONT_SCALE = 1.2;

export interface CatalogGridScreenProps {
  /** Large title; collapses into the nav bar as the list scrolls. */
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterPress: () => void;
  filterActive: boolean;
  /** Scrolls with the title, above the pinned search bar (the vehicle pill). */
  accessory?: ReactNode;
  accessoryHeight?: number;

  products: Product[];
  loading: boolean;
  vehicle: SelectedVehicle | null;
  guaranteedFit?: boolean;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  refreshing: boolean;

  emptyTitle: string;
  emptyMessage: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  /** Rendered after the list (the filter sheet). */
  children?: ReactNode;
}

// The shared body of the Category and Vehicle Parts screens: native back
// button + a filter button in the nav bar, a 34pt large title that collapses
// into the bar, an iOS search bar that pins under it, and the product grid.
export function CatalogGridScreen({
  title,
  searchValue,
  onSearchChange,
  onFilterPress,
  filterActive,
  accessory,
  accessoryHeight = 0,
  products,
  loading,
  vehicle,
  guaranteedFit,
  onEndReached,
  isFetchingNextPage,
  onRefresh,
  refreshing,
  emptyTitle,
  emptyMessage,
  hasActiveFilters,
  onClearFilters,
  children,
}: CatalogGridScreenProps) {
  const navigation = useNavigation();
  const columns = useGridColumns();
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE);

  // Title block: one 41pt line (scaled) plus 8pt below. The search bar then
  // sits `pinOffset` down the list and sticks once the list scrolls that far.
  const titleHeight = Math.ceil(41 * scale) + 8;
  const pinOffset = titleHeight + accessoryHeight;

  const scrollY = useSharedValue(0);
  const filterPressRef = useRef(onFilterPress);
  filterPressRef.current = onFilterPress;

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <InlineNavTitle title={title} scrollY={scrollY} fadeStart={titleHeight * 0.6} fadeEnd={titleHeight} />,
      headerRight: () => <FilterButton active={filterActive} onPress={() => filterPressRef.current()} />,
    });
  }, [navigation, title, filterActive, scrollY, titleHeight]);

  const pinnedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(pinOffset - scrollY.value, 0) }],
  }));
  const pinnedChromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [pinOffset - 8, pinOffset], [0, 1], Extrapolation.CLAMP),
  }));

  const header = (
    <View style={{ height: pinOffset + SEARCH_BAR_HEIGHT }}>
      <View style={[styles.titleWrap, { height: titleHeight }]}>
        <LargeTitleHeader title={title} numberOfLines={1} />
      </View>
      {accessory}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {loading ? (
        <View style={styles.skeletonList}>
          {header}
          <View style={styles.skeletonGrid}>
            {Array.from({ length: columns * 3 }).map((_, i) => (
              <View key={i} style={[styles.skeletonCell, { width: `${100 / columns}%` }]}>
                <ProductTileSkeleton />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <FlashList
          key={`grid-${columns}`}
          data={products}
          keyExtractor={(item: Product) => item.id}
          numColumns={columns}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={(e) => {
            scrollY.value = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          ListHeaderComponent={header}
          renderItem={({ item }: { item: Product }) => (
            <View style={styles.cell}>
              <CatalogProductCard product={item} vehicle={vehicle} guaranteedFit={guaranteedFit} />
            </View>
          )}
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.ink3} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={48} color={colors.ink3} />
              <Text style={styles.emptyTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {emptyTitle}
              </Text>
              <Text style={styles.emptyMessage} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {emptyMessage}
              </Text>
              {hasActiveFilters && <Button label="Clear filters" variant="primary" onPress={onClearFilters} style={styles.emptyButton} />}
            </View>
          }
        />
      )}

      {/* Pinned search bar: rides down the list with the title, then sticks. */}
      <Animated.View pointerEvents="box-none" style={[styles.pinned, pinnedStyle]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, pinnedChromeStyle]}>
          <NavBarBackground />
          <View style={styles.hairline} />
        </Animated.View>
        <SearchBar
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder="Search part number or name"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.search}
        />
      </Animated.View>

      {children}
    </SafeAreaView>
  );
}

// The 17pt inline title, shown in the native header once the large title has
// scrolled away.
function InlineNavTitle({
  title,
  scrollY,
  fadeStart,
  fadeEnd,
}: {
  title: string;
  scrollY: SharedValue<number>;
  fadeStart: number;
  fadeEnd: number;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [fadeStart, fadeEnd], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.Text numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.inlineTitle, style]}>
      {title}
    </Animated.Text>
  );
}

function FilterButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Filter and sort, filters applied' : 'Filter and sort'}
      style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
    >
      <Settings2 size={22} color={colors.ink} />
      {active && <View style={styles.filterDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  // The list pads by (screen margin - half the cell gap) so cells land on the
  // 20pt margin; the title block and pinned bar cancel that to sit on it too.
  listContent: { paddingHorizontal: screenPaddingX - GRID_GAP / 2, paddingBottom: 24 },
  skeletonList: { flex: 1, paddingHorizontal: screenPaddingX - GRID_GAP / 2 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  titleWrap: { marginHorizontal: -(screenPaddingX - GRID_GAP / 2) },
  // FlashList sizes each row's cells to an equal share of the width; the cell
  // only adds the gutter.
  cell: { flex: 1, paddingHorizontal: GRID_GAP / 2, paddingBottom: GRID_GAP },
  // The loading skeleton is a plain wrapping row, not a FlashList, so its cells need an explicit column width.
  skeletonCell: { paddingHorizontal: GRID_GAP / 2, paddingBottom: GRID_GAP },
  pinned: { position: 'absolute', top: 0, left: 0, right: 0, height: SEARCH_BAR_HEIGHT, justifyContent: 'center' },
  search: { marginHorizontal: screenPaddingX },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  inlineTitle: { ...textStyles.headline },
  filterButton: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: 9, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  pressed: { opacity: 0.6 },
  footer: { paddingVertical: 16 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 12 },
  emptyTitle: { ...textStyles.headline, textAlign: 'center' },
  emptyMessage: { ...textStyles.callout, textAlign: 'center' },
  emptyButton: { marginTop: 8 },
});
