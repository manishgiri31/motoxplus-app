import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useInfiniteProducts } from '@/api/hooks/useProducts';
import type { Product } from '@/api/types';
import { CatalogFilterSheet, type CatalogFilters } from '@/src/components/catalog/CatalogFilterSheet';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { Button, ErrorState, SkeletonProductCard } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { useVehicleStore } from '@/stores/vehicleStore';
import { sortProducts } from '@/utils/sortProducts';

// Results screen for the home-screen vehicle picker (VehiclePickerCard).
// `vehicle`/`variant` are real, documented GET /api/products filter params
// (docs/api.md §4) — only the taxonomy of valid values (constants/vehicleTaxonomy.ts)
// is a placeholder, so this may return an empty/unfiltered list until the
// backend ships a real vehicle-fitment taxonomy the picker can match against.
export default function VehiclePartsScreen() {
  const { vehicle, variant, label } = useLocalSearchParams<{ vehicle?: string; variant?: string; label?: string }>();
  const navigation = useNavigation();
  const categoriesQuery = useCategories();
  const selectedVehicle = useVehicleStore((s) => s.selectedVehicle);
  const clearSelectedVehicle = useVehicleStore((s) => s.clearSelectedVehicle);

  const query = useInfiniteProducts({ vehicle, variant });
  const fetchedProducts = useMemo(() => query.data?.pages.flatMap((p) => p.products) ?? [], [query.data]);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>({ categorySlug: null, inStockOnly: false, sort: 'default' });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: label ?? 'Compatible parts' });
  }, [navigation, label]);

  const products = useMemo(() => {
    let list = fetchedProducts;
    const q = search.trim().toUpperCase();
    if (q) {
      list = list.filter((p) => p.partNumber.toUpperCase().includes(q) || p.name.toUpperCase().includes(q));
    }
    if (filters.categorySlug) {
      list = list.filter((p) => p.category.slug === filters.categorySlug);
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }
    return sortProducts(list, filters.sort);
  }, [fetchedProducts, search, filters]);

  const hasActiveFilters = !!search || filters.inStockOnly || filters.sort !== 'default' || !!filters.categorySlug;
  const clearFilters = () => {
    setSearch('');
    setFilters({ categorySlug: null, inStockOnly: false, sort: 'default' });
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
      {selectedVehicle && (
        <View style={styles.vehiclePill}>
          <Text style={styles.vehiclePillText} numberOfLines={1}>
            {selectedVehicle.brandName} {selectedVehicle.modelName} · {selectedVehicle.variant}
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Change vehicle"
          >
            <Text style={styles.vehiclePillAction}>Change</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              clearSelectedVehicle();
              router.back();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear vehicle filter"
          >
            <Feather name="x" size={16} color={colors.muted} />
          </Pressable>
        </View>
      )}

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
              <Text style={styles.emptyTitle}>No compatible parts found</Text>
              <Text style={styles.emptyMessage}>
                {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Try a different model or variant.'}
              </Text>
              {hasActiveFilters && <Button label="Clear filters" variant="ghost" onPress={clearFilters} style={styles.emptyButton} />}
            </View>
          }
        />
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
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.dark,
  },
  vehiclePillText: { flex: 1, fontFamily: fonts.mono.regular, fontSize: 12, color: '#FFFFFF' },
  vehiclePillAction: { fontFamily: fonts.body.semiBold, fontSize: 12, color: colors.red },
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
