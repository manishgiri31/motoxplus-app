import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useInfiniteProducts } from '@/api/hooks/useProducts';
import { CatalogFilterSheet, type CatalogFilters } from '@/src/components/catalog/CatalogFilterSheet';
import { CatalogGridScreen } from '@/src/components/catalog/CatalogGridScreen';
import { ErrorState } from '@/src/components/ui';
import { colors } from '@/src/theme';
import { useVehicleStore } from '@/stores/vehicleStore';
import { applyCatalogFilters, brandsOf, defaultCatalogFilters, hasCatalogFilters } from '@/utils/catalogFilters';

export default function CategoryProductsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const categoriesQuery = useCategories();
  const selectedVehicle = useVehicleStore((s) => s.selectedVehicle);

  const query = useInfiniteProducts({ category: slug });
  const fetchedProducts = useMemo(() => query.data?.pages.flatMap((p) => p.products) ?? [], [query.data]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>(() => defaultCatalogFilters(slug ?? null));
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const category = categoriesQuery.data?.find((c) => c.slug === slug);
  const title = category?.name ?? (slug ? slug.replace(/-/g, ' ') : 'Category');

  const products = useMemo(() => {
    let list = fetchedProducts;
    const q = search.trim().toUpperCase();
    if (q) {
      list = list.filter((p) => p.partNumber.toUpperCase().includes(q) || p.name.toUpperCase().includes(q));
    }
    // The server already scoped this list to the category (sub-categories
    // included), so don't filter by slug again here.
    return applyCatalogFilters(list, { ...filters, categorySlug: null });
  }, [fetchedProducts, search, filters]);
  const productBrands = useMemo(() => brandsOf(fetchedProducts), [fetchedProducts]);

  const hasActiveFilters = !!search || hasCatalogFilters(filters, slug ?? null);
  const clearFilters = () => {
    setSearch('');
    setFilters(defaultCatalogFilters(slug ?? null));
  };

  if (query.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <CatalogGridScreen
      title={title}
      searchValue={search}
      onSearchChange={setSearch}
      onFilterPress={() => setFilterSheetOpen(true)}
      filterActive={hasCatalogFilters(filters, slug ?? null)}
      products={products}
      loading={query.isLoading}
      vehicle={selectedVehicle}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      isFetchingNextPage={query.isFetchingNextPage}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
      emptyTitle="No products found"
      emptyMessage={hasActiveFilters ? 'Try adjusting your search or filters.' : 'No products in this category yet.'}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={clearFilters}
    >
      <CatalogFilterSheet
        visible={filterSheetOpen}
        categories={undefined}
        brands={productBrands}
        value={filters}
        onApply={setFilters}
        onClose={() => setFilterSheetOpen(false)}
      />
    </CatalogGridScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
