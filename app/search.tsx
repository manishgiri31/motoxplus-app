import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useInfiniteProducts, useProductSearch } from '@/api/hooks/useProducts';
import type { Category, Product, ProductSuggestion } from '@/api/types';
import { SearchSuggestions } from '@/components/SearchSuggestions';
import { Image } from '@/components/ui';
import { CatalogFilterSheet, type CatalogFilters } from '@/src/components/catalog/CatalogFilterSheet';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { EmptyState, SkeletonProductCard } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { useRecentSearchesStore } from '@/stores/recentSearchesStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';
import { PRODUCT_SORT_OPTIONS, sortProducts } from '@/utils/sortProducts';

// No "popular searches" analytics endpoint on the backend — this is a
// static, curated list of common catalog terms for a motorcycle-parts
// dealer, shown before the user types anything.
const POPULAR_SEARCHES = [
  'Brake Pads',
  'Engine Oil',
  'Chain Sprocket Kit',
  'Clutch Plate',
  'Spark Plug',
  'Air Filter',
];

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const SuggestionRow = memo(function SuggestionRow({ suggestion }: { suggestion: ProductSuggestion }) {
  return (
    <Pressable
      onPress={() => router.push(`/product/${suggestion.id}`)}
      style={styles.suggestionRow}
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.name}, ${suggestion.categoryName}, ${suggestion.brand}`}
    >
      <Image source={getImageSource(suggestion.imageUrl)} style={styles.suggestionImage} cachePolicy="memory-disk" />
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionName} numberOfLines={1}>
          {suggestion.name}
        </Text>
        <Text style={styles.suggestionMeta}>
          {suggestion.categoryName} · {suggestion.brand}
        </Text>
      </View>
    </Pressable>
  );
});

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const selectedVehicle = useVehicleStore((s) => s.selectedVehicle);

  const recentSearches = useRecentSearchesStore((s) => s.queries);
  const recordSearch = useRecentSearchesStore((s) => s.record);
  const clearRecentSearches = useRecentSearchesStore((s) => s.clear);
  const categoriesQuery = useCategories();
  const suggestedCategories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => b._count.products - a._count.products).slice(0, 6),
    [categoriesQuery.data]
  );

  const suggestionsQuery = useProductSearch(debouncedQuery);
  const resultsQuery = useInfiniteProducts({ search: debouncedQuery.trim().length >= 2 ? debouncedQuery : undefined });

  const [filters, setFilters] = useState<CatalogFilters>({ categorySlug: null, inStockOnly: false, sort: 'default' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const fetchedResults = useMemo(() => resultsQuery.data?.pages.flatMap((p) => p.products) ?? [], [resultsQuery.data]);
  const results = useMemo(() => {
    let list = fetchedResults;
    if (filters.categorySlug) {
      list = list.filter((p) => p.category.slug === filters.categorySlug);
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }
    return sortProducts(list, filters.sort);
  }, [fetchedResults, filters]);
  const sortLabel = PRODUCT_SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? 'Featured';
  const filterCategoryLabel = filters.categorySlug
    ? (categoriesQuery.data?.find((c) => c.slug === filters.categorySlug)?.name ?? null)
    : null;
  const hasActiveFilters = !!filters.categorySlug || filters.inStockOnly || filters.sort !== 'default';
  const showSuggestions = debouncedQuery.trim().length >= 2 && debouncedQuery.trim().length < 4;

  const selectCategory = (category: Category) => {
    router.push(`/category/${category.slug}`);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => recordSearch(query)}
            placeholder="Search parts, brands, part numbers…"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search parts, brands, part numbers"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={14} accessibilityRole="button" accessibilityLabel="Clear search">
              <Feather name="x" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>

      {query.trim().length < 2 ? (
        <SearchSuggestions
          recentSearches={recentSearches}
          onSelectSearch={(q) => {
            setQuery(q);
            recordSearch(q);
          }}
          onClearRecent={clearRecentSearches}
          popularSearches={POPULAR_SEARCHES}
          suggestedCategories={suggestedCategories}
          onSelectCategory={selectCategory}
        />
      ) : showSuggestions && suggestionsQuery.data ? (
        <FlatList
          data={suggestionsQuery.data.suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SuggestionRow suggestion={item} />}
          contentContainerStyle={suggestionsQuery.data.suggestions.length === 0 ? styles.emptyContent : undefined}
          refreshControl={
            <RefreshControl
              refreshing={suggestionsQuery.isRefetching}
              onRefresh={() => {
                HapticService.light();
                suggestionsQuery.refetch();
              }}
              tintColor={colors.red}
              colors={[colors.red]}
            />
          }
          ListEmptyComponent={<EmptyState icon="search" title="No matches" message={`Nothing found for "${query}"`} />}
        />
      ) : (
        <>
          {(results.length > 0 || hasActiveFilters) && (
            <View style={styles.sortRow}>
              <Pressable
                onPress={() => {
                  HapticService.light();
                  setFilterSheetOpen(true);
                }}
                style={styles.sortButton}
                accessibilityRole="button"
                accessibilityLabel={`Filter and sort, currently ${filterCategoryLabel ? `${filterCategoryLabel}, ` : ''}${filters.inStockOnly ? 'in stock only, ' : ''}sorted by ${sortLabel}`}
              >
                <Feather name="sliders" size={14} color={colors.muted} />
                <Text style={styles.sortLabel}>
                  {filterCategoryLabel ? `${filterCategoryLabel} · ` : ''}
                  {filters.inStockOnly ? 'In stock · ' : ''}
                  {sortLabel}
                </Text>
              </Pressable>
            </View>
          )}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.resultsRow}
            contentContainerStyle={[styles.resultsContent, results.length === 0 && styles.emptyContent]}
            renderItem={({ item }: { item: Product }) => (
              <View style={styles.resultCell}>
                <CatalogProductCard product={item} vehicle={selectedVehicle} />
              </View>
            )}
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
                tintColor={colors.red}
                colors={[colors.red]}
              />
            }
            ListFooterComponent={resultsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.red} /> : null}
            ListEmptyComponent={
              resultsQuery.isLoading ? (
                <View style={styles.loadingGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={styles.resultCell}>
                      <SkeletonProductCard />
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="search"
                  title="No results"
                  message={
                    hasActiveFilters
                      ? `Nothing found for "${query}" with these filters applied.`
                      : `Nothing found for "${query}". Try a different name, brand, or part number.`
                  }
                  actionLabel={hasActiveFilters ? 'Clear filters' : 'Clear search'}
                  onAction={
                    hasActiveFilters
                      ? () => setFilters({ categorySlug: null, inStockOnly: false, sort: 'default' })
                      : () => setQuery('')
                  }
                />
              )
            }
          />
        </>
      )}
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
  screen: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  searchInput: { flex: 1, fontFamily: fonts.mono.regular, fontSize: 13, color: colors.ink },
  cancelLabel: { fontFamily: fonts.body.semiBold, fontSize: 15, color: colors.ink },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  suggestionImage: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.card },
  suggestionText: { flex: 1 },
  suggestionName: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.ink },
  suggestionMeta: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.ink },
  resultsRow: { paddingHorizontal: 8, gap: 0 },
  resultsContent: { paddingHorizontal: 8, paddingVertical: 16 },
  resultCell: { flex: 1, paddingHorizontal: 8, paddingBottom: 16 },
  loadingGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 16 },
  footer: { paddingVertical: 16 },
  emptyContent: { flexGrow: 1 },
});
