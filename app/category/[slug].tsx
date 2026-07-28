import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useInfiniteProducts } from '@/api/hooks/useProducts';
import type { Product } from '@/api/types';
import { EmptyState, ErrorState, ProductCard, ProductCardSkeleton, SortSheet } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { HapticService } from '@/utils/haptics';
import { PRODUCT_SORT_OPTIONS, sortProducts, type ProductSortOption } from '@/utils/sortProducts';

// Module-level so ProductCard's memo() sees a stable onPress reference.
function openProduct(product: Product) {
  router.push(`/product/${product.id}`);
}

export default function CategoryProductsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const colors = useThemeColors();

  const query = useInfiniteProducts({ category: slug });
  const fetchedProducts = useMemo(() => query.data?.pages.flatMap((p) => p.products) ?? [], [query.data]);

  const [sort, setSort] = useState<ProductSortOption>('default');
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const products = useMemo(() => sortProducts(fetchedProducts, sort), [fetchedProducts, sort]);
  const sortLabel = PRODUCT_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Featured';

  useEffect(() => {
    navigation.setOptions({ title: slug ? slug.replace(/-/g, ' ') : 'Category' });
  }, [navigation, slug]);

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ScrollView contentContainerClassName="p-lg">
          <View className="flex-row flex-wrap gap-md">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} className="w-[47%]">
                <ProductCardSkeleton />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (query.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="flex-row justify-end px-lg py-sm border-b border-border">
        <Pressable
          onPress={() => {
            HapticService.light();
            setSortSheetOpen(true);
          }}
          className="flex-row items-center gap-xs"
          accessibilityRole="button"
          accessibilityLabel={`Sort by, currently ${sortLabel}`}
        >
          <Feather name="sliders" size={14} color={colors.text} />
          <Text className="text-[13px] font-medium text-text">Sort: {sortLabel}</Text>
        </Pressable>
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperClassName="px-lg gap-md"
        contentContainerClassName="gap-md py-lg"
        renderItem={({ item }: { item: Product }) => (
          <View className="flex-1">
            <ProductCard product={item} onPress={openProduct} />
          </View>
        )}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-lg" color={colors.text} /> : null}
        ListEmptyComponent={<EmptyState icon="box" title="No products in this category yet" />}
      />
      <SortSheet
        visible={sortSheetOpen}
        value={sort}
        options={PRODUCT_SORT_OPTIONS}
        onSelect={setSort}
        onClose={() => setSortSheetOpen(false)}
      />
    </SafeAreaView>
  );
}
