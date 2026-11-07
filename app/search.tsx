import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useInfiniteProducts, useProductSearch } from '@/api/hooks/useProducts';
import type { Category, Product, ProductSuggestion } from '@/api/types';
import { SearchSuggestions } from '@/components/SearchSuggestions';
import { Image } from '@/components/ui';
import { useGridColumns } from '@/hooks/use-grid-columns';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { CatalogFilterSheet, type CatalogFilters } from '@/src/components/catalog/CatalogFilterSheet';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { SEARCH_PLACEHOLDER } from '@/src/components/home/SearchPill';
import { EmptyState, Skeleton, SkeletonProductCard } from '@/src/components/ui';
import { SearchBar } from '@/src/components/ui/SearchBar';
import { colors, font, radii, screenPaddingX, textStyles } from '@/src/theme';
import { POPULAR_SEARCHES } from '@/constants/popularSearches';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useRecentSearchesStore } from '@/stores/recentSearchesStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';
import { PRODUCT_SORT_OPTIONS, sortProducts } from '@/utils/sortProducts';
import { isOutOfStock } from '@/utils/stock';

const DEFAULT_FILTERS: CatalogFilters = { categorySlug: null, inStockOnly: false, sort: 'default' };

// Dealers mostly search by part number, so it leads the second line.
const SuggestionRow = memo(function SuggestionRow({
  suggestion,
  onOpen,
}: {
  suggestion: ProductSuggestion;
  onOpen: (suggestion: ProductSuggestion) => void;
}) {
  return (
    <Pressable
      onPress={() => onOpen(suggestion)}
      style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.name}, part ${suggestion.partNumber}, ${suggestion.categoryName}`}
    >
      <Image
        source={getImageSource(suggestion.imageUrl)}
        style={styles.suggestionImage}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionName} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {suggestion.name}
        </Text>
        <Text style={styles.suggestionMeta} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {[suggestion.partNumber, suggestion.categoryName].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.ink3} />
    </Pressable>
  );
});

function SuggestionSeparator() {
  return <View style={styles.suggestionSeparator} />;
}

// Same shape as SuggestionRow (44pt thumbnail, two text lines) so the list
// doesn't jump when real rows replace it.
function SuggestionSkeletons() {
  return (
    <View accessibilityLabel="Loading suggestions" accessibilityLiveRegion="polite">
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i}>
          {i > 0 && <SuggestionSeparator />}
          <View style={styles.suggestionRow}>
            <Skeleton width={44} height={44} radius={radii.sm} />
            <View style={styles.suggestionText}>
              <Skeleton height={17} width="65%" />
              <Skeleton height={14} width="40%" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SearchScreen() {
  useLightStatusBar();
  const columns = useGridColumns();
  const insets = useSafeAreaInsets();
  // ?q= opens straight onto the results for that text.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof q === 'string' ? q : '';
  const [query, setQuery] = useState(initialQuery);
  // Pressing Search on the keyboard (or picking a recent/popular search) shows
  // the full results even for a short query such as "H4"; typing again goes
  // back to live suggestions.
  const [submitted, setSubmitted] = useState(initialQuery.trim().length >= 2);
  const debouncedQuery = useDebouncedValue(query, 300);
  const selectedVehicle = useVehicleStore((s) => s.selectedVehicle);

  const recentSearches = useRecentSearchesStore((s) => s.queries);
  const recordSearch = useRecentSearchesStore((s) => s.record);
  const removeRecentSearch = useRecentSearchesStore((s) => s.remove);
  const clearRecentSearches = useRecentSearchesStore((s) => s.clear);
  const categoriesQuery = useCategories();
  const suggestedCategories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => b._count.products - a._count.products).slice(0, 6),
    [categoriesQuery.data]
  );

  const suggestionsQuery = useProductSearch(debouncedQuery);
  const resultsQuery = useInfiniteProducts({ search: debouncedQuery.trim().length >= 2 ? debouncedQuery : undefined });

  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const fetchedResults = useMemo(() => resultsQuery.data?.pages.flatMap((p) => p.products) ?? [], [resultsQuery.data]);
  const results = useMemo(() => {
    let list = fetchedResults;
    if (filters.categorySlug) {
      list = list.filter((p) => p.category.slug === filters.categorySlug);
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => !isOutOfStock(p));
    }
    return sortProducts(list, filters.sort);
  }, [fetchedResults, filters]);
  const sortLabel = PRODUCT_SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? 'Featured';
  const filterCategoryLabel = filters.categorySlug
    ? (categoriesQuery.data?.find((c) => c.slug === filters.categorySlug)?.name ?? null)
    : null;
  const hasActiveFilters = !!filters.categorySlug || filters.inStockOnly || filters.sort !== 'default';

  // Which body to show follows what's typed right now (<2 idle, 2-3 instant
  // suggestions, 4+ or submitted: results); the data behind it follows the
  // debounced value. While the two differ the body shows skeletons instead of
  // stale or unrelated content. A failed suggestions request falls through to
  // results.
  const trimmed = query.trim();
  const trimmedLength = trimmed.length;
  const settling = query !== debouncedQuery;
  const mode: 'idle' | 'suggest' | 'results' =
    trimmedLength < 2
      ? 'idle'
      : trimmedLength < 4 && !submitted && !suggestionsQuery.isError
        ? 'suggest'
        : 'results';
  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const suggestionsLoading = settling || suggestionsQuery.isLoading;
  const resultsLoading = settling || resultsQuery.isLoading;

  const changeQuery = (text: string) => {
    setQuery(text);
    setSubmitted(false);
  };

  const showResults = (text: string) => {
    if (text.trim().length < 2) return;
    setQuery(text);
    recordSearch(text);
    setSubmitted(true);
  };

  const openSuggestion = (suggestion: ProductSuggestion) => {
    recordSearch(query);
    router.push(`/product/${suggestion.id}`);
  };

  const selectCategory = (category: Category) => {
    router.push(`/category/${category.slug}`);
  };
  const browseCategories = () => router.dismissTo('/(tabs)/categories');
  const bottomPadding = insets.bottom + 24;
  const cellWidth = `${100 / columns}%` as const;

  const noResults = (
    <EmptyState
      icon="search"
      title={`No parts match "${query.trim()}"`}
      message={hasActiveFilters ? 'Try removing some filters.' : undefined}
      actionLabel={hasActiveFilters ? 'Clear filters' : 'Browse categories'}
      actionVariant="secondary"
      onAction={hasActiveFilters ? () => setFilters(DEFAULT_FILTERS) : browseCategories}
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Same red band and white field as Home's search, so tapping it there
          reads as focusing this field; Cancel closes the screen. */}
      <View style={styles.header}>
        <SearchBar
          tone="onAccent"
          autoFocus={!initialQuery}
          value={query}
          onChangeText={changeQuery}
          onSubmitEditing={() => showResults(query)}
          onCancel={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          placeholder={SEARCH_PLACEHOLDER}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.body}>
      {mode === 'idle' ? (
        <SearchSuggestions
          recentSearches={recentSearches}
          onSelectSearch={showResults}
          onRemoveRecent={removeRecentSearch}
          onClearRecent={clearRecentSearches}
          popularSearches={POPULAR_SEARCHES}
          suggestedCategories={suggestedCategories}
          categoriesLoading={categoriesQuery.isLoading}
          onSelectCategory={selectCategory}
          bottomInset={insets.bottom}
        />
      ) : mode === 'suggest' ? (
        suggestionsLoading ? (
          <SuggestionSkeletons />
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SuggestionRow suggestion={item} onOpen={openSuggestion} />}
            ItemSeparatorComponent={SuggestionSeparator}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={suggestions.length === 0 ? styles.emptyContent : { paddingBottom: bottomPadding }}
            refreshControl={
              <RefreshControl
                refreshing={suggestionsQuery.isRefetching}
                onRefresh={() => {
                  HapticService.light();
                  suggestionsQuery.refetch();
                }}
                tintColor={colors.ink3}
                colors={[colors.ink3]}
              />
            }
            ListFooterComponent={
              suggestions.length > 0 ? (
                <>
                  <SuggestionSeparator />
                  <Pressable
                    onPress={() => showResults(query)}
                    style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`See all results for ${trimmed}`}
                  >
                    <View style={styles.seeAllIcon}>
                      <Feather name="search" size={18} color={colors.link} />
                    </View>
                    <Text style={styles.seeAllLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {`See all results for "${trimmed}"`}
                    </Text>
                  </Pressable>
                </>
              ) : null
            }
            ListEmptyComponent={noResults}
          />
        )
      ) : (
        <>
          {!settling && (results.length > 0 || hasActiveFilters) && (
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => {
                  HapticService.light();
                  setFilterSheetOpen(true);
                }}
                hitSlop={{ top: 4, bottom: 4 }}
                style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Filter and sort, currently ${filterCategoryLabel ? `${filterCategoryLabel}, ` : ''}${filters.inStockOnly ? 'in stock only, ' : ''}sorted by ${sortLabel}`}
              >
                <Feather name="sliders" size={16} color={hasActiveFilters ? colors.accent : colors.ink2} />
                <Text style={styles.filterLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {filterCategoryLabel ? `${filterCategoryLabel} · ` : ''}
                  {filters.inStockOnly ? 'In stock · ' : ''}
                  {sortLabel}
                </Text>
              </Pressable>
            </View>
          )}
          <FlatList
            key={`grid-${columns}`}
            data={settling ? [] : results}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            contentContainerStyle={[
              styles.resultsContent,
              { paddingBottom: bottomPadding },
              (settling || results.length === 0) && styles.emptyContent,
            ]}
            renderItem={({ item }: { item: Product }) => (
              <View style={[styles.resultCell, { width: cellWidth }]}>
                <CatalogProductCard product={item} vehicle={selectedVehicle} />
              </View>
            )}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            removeClippedSubviews
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={7}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (resultsQuery.hasNextPage && !resultsQuery.isFetchingNextPage) resultsQuery.fetchNextPage();
            }}
            refreshControl={
              <RefreshControl
                refreshing={resultsQuery.isRefetching && !resultsQuery.isFetchingNextPage}
                onRefresh={() => {
                  HapticService.light();
                  resultsQuery.refetch();
                }}
                tintColor={colors.ink3}
                colors={[colors.ink3]}
              />
            }
            ListFooterComponent={resultsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.ink3} /> : null}
            ListEmptyComponent={
              resultsLoading ? (
                <View style={styles.loadingGrid} accessibilityLabel="Loading results" accessibilityLiveRegion="polite">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={[styles.resultCell, { width: cellWidth }]}>
                      <SkeletonProductCard />
                    </View>
                  ))}
                </View>
              ) : (
                noResults
              )
            }
          />
        </>
      )}
      </View>
      <CatalogFilterSheet
        visible={filterSheetOpen}
        categories={categoriesQuery.data}
        value={filters}
        onApply={setFilters}
        onClose={() => setFilterSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Red behind the status bar and the search band; the body is white.
  screen: { flex: 1, backgroundColor: colors.accent },
  body: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.6 },

  header: { paddingHorizontal: screenPaddingX, paddingTop: 4, paddingBottom: 12, backgroundColor: colors.accent },
  seeAllIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  seeAllLabel: { flex: 1, ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.link },

  // Instant suggestions
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  suggestionImage: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.bgAlt },
  suggestionText: { flex: 1, gap: 2 },
  suggestionName: { ...textStyles.body },
  suggestionMeta: { ...textStyles.callout },
  // Inset past the thumbnail: 20 padding + 44 image + 12 gap.
  suggestionSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 76 },

  // Results
  filterRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  filterButton: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.bgAlt,
  },
  filterLabel: { flexShrink: 1, ...textStyles.callout, color: colors.ink },
  // 14 + 6 cell padding = 20 screen edge, 12 between cells. Width is a fixed
  // fraction (not flex: 1) so an odd last item doesn't stretch across the row.
  resultsContent: { paddingHorizontal: 14, paddingTop: 8 },
  resultCell: { paddingHorizontal: 6, paddingBottom: 12 },
  loadingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { paddingVertical: 16 },
  emptyContent: { flexGrow: 1 },
});
