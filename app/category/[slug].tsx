import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Product } from '@/api/types';
import { useCategories } from '@/api/hooks/useCategories';
import { useInfiniteProducts } from '@/api/hooks/useProducts';
import { CatalogFilterSheet, type CatalogFilters } from '@/src/components/catalog/CatalogFilterSheet';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { Button, ErrorState, SkeletonProductCard } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { useVehicleStore } from '@/stores/vehicleStore';
import { sortProducts } from '@/utils/sortProducts';

export default function CategoryProductsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const categoriesQuery = useCategories();
  const selectedVehicle = useVehicleStore((s) => s.selectedVehicle);

  const query = useInfiniteProducts({ category: slug });
  const fetchedProducts = useMemo(() => query.data?.pages.flatMap((p) => p.products) ?? [], [query.data]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>({ categorySlug: slug ?? null, inStockOnly: false, sort: 'default' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const category = categoriesQuery.data?.find((c) => c.slug === slug);

  useEffect(() => {
    navigation.setOptions({ title: category?.name ?? (slug ? slug.replace(/-/g, ' ') : 'Category') });
  }, [navigation, slug, category]);

  const products = useMemo(() => {
    let list = fetchedProducts;
    const q = search.trim().toUpperCase();
    if (q) {
      list = list.filter((p) => p.partNumber.toUpperCase().includes(q) || p.name.toUpperCase().includes(q));
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }
    return sortProducts(list, filters.sort);
  }, [fetchedProducts, search, filters]);

  const hasActiveFilters = !!search || filters.inStockOnly || filters.sort !== 'default';
  const clearFilters = () => {
    setSearch('');
    setFilters({ categorySlug: slug ?? null, inStockOnly: false, sort: 'default' });
  };

  if (query.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search part number or name"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={() => setFilterSheetOpen(true)}
          style={styles.filterButton}
          accessibilityRole="button"
          accessibilityLabel="Filter and sort"
        >
          <Feather name="sliders" size={16} color={colors.ink} />
        </Pressable>
      </View>

      {query.isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.cell}>
              <SkeletonProductCard />
            </View>
          ))}
        </View>
      ) : (
        <FlashList
          data={products}
          keyExtractor={(item: Product) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: Product }) => (
            <View style={styles.cell}>
              <CatalogProductCard product={item} vehicle={selectedVehicle} />
            </View>
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          onRefresh={() => query.refetch()}
          refreshing={query.isRefetching}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.red} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyMessage}>
                {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No products in this category yet.'}
              </Text>
              {hasActiveFilters && <Button label="Clear filters" variant="ghost" onPress={clearFilters} style={styles.emptyButton} />}
            </View>
          }
        />
      )}

      <CatalogFilterSheet
        visible={filterSheetOpen}
        categories={undefined}
        value={filters}
        onApply={setFilters}
        onClose={() => setFilterSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16 },
  cell: { flex: 1, maxWidth: '50%', paddingHorizontal: 8, paddingBottom: 16 },
  listContent: { paddingHorizontal: 8, paddingBottom: 16 },
  footer: { paddingVertical: 16 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 64, gap: 8 },
  emptyTitle: { fontFamily: fonts.display.bold, fontSize: 17, color: colors.ink },
  emptyMessage: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  emptyButton: { marginTop: 12 },
});
