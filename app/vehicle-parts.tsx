import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useInfiniteProducts } from '@/api/hooks/useProducts';
import { CatalogFilterSheet, type CatalogFilters } from '@/src/components/catalog/CatalogFilterSheet';
import { CatalogGridScreen } from '@/src/components/catalog/CatalogGridScreen';
import { ErrorState } from '@/src/components/ui';
import { VEHICLE_PILL_BLOCK_HEIGHT, VehiclePill } from '@/src/components/vehicle/VehiclePill';
import { colors } from '@/src/theme';
import { useVehicleStore } from '@/stores/vehicleStore';
import { applyCatalogFilters, brandsOf, defaultCatalogFilters, hasCatalogFilters } from '@/utils/catalogFilters';

// Results screen for the home-screen vehicle picker (VehiclePickerCard).
// `vehicle`/`variant` are the model/variant slugs from GET /api/vehicles,
// matched server-side against the real ProductCompatibility fitment table —
// every result here is already guaranteed compatible.
export default function VehiclePartsScreen() {
  const { vehicle, variant, label } = useLocalSearchParams<{ vehicle?: string; variant?: string; label?: string }>();
  const categoriesQuery = useCategories();
  const selectedVehicle = useVehicleStore((s) => s.selectedVehicle);
  const clearSelectedVehicle = useVehicleStore((s) => s.clearSelectedVehicle);

  const query = useInfiniteProducts({ vehicle, variant });
  const fetchedProducts = useMemo(() => query.data?.pages.flatMap((p) => p.products) ?? [], [query.data]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>(() => defaultCatalogFilters(null));
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const products = useMemo(() => {
    let list = fetchedProducts;
    const q = search.trim().toUpperCase();
    if (q) {
      list = list.filter((p) => p.partNumber.toUpperCase().includes(q) || p.name.toUpperCase().includes(q));
    }
    return applyCatalogFilters(list, filters);
  }, [fetchedProducts, search, filters]);
  const productBrands = useMemo(() => brandsOf(fetchedProducts), [fetchedProducts]);

  const hasActiveFilters = !!search || hasCatalogFilters(filters, null);
  const clearFilters = () => {
    setSearch('');
    setFilters(defaultCatalogFilters(null));
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
      title={label ?? 'Compatible parts'}
      searchValue={search}
      onSearchChange={setSearch}
      onFilterPress={() => setFilterSheetOpen(true)}
      filterActive={hasCatalogFilters(filters, null)}
      accessory={
        selectedVehicle ? (
          <VehiclePill
            label={`${selectedVehicle.brandName} ${selectedVehicle.modelName} · ${selectedVehicle.variant}`}
            onChange={() => router.push('/(tabs)')}
            onClear={() => {
              clearSelectedVehicle();
              router.back();
            }}
          />
        ) : undefined
      }
      accessoryHeight={selectedVehicle ? VEHICLE_PILL_BLOCK_HEIGHT : 0}
      products={products}
      loading={query.isLoading}
      vehicle={selectedVehicle}
      guaranteedFit
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      isFetchingNextPage={query.isFetchingNextPage}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
      emptyTitle="No compatible parts found"
      emptyMessage={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Try a different model or variant.'}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={clearFilters}
    >
      <CatalogFilterSheet
        visible={filterSheetOpen}
        categories={categoriesQuery.data}
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
