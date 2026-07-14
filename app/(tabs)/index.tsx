import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import { useInfiniteProducts } from '@/api/hooks/useProducts';
import { useRecentlyViewedProducts } from '@/api/hooks/useRecentlyViewedProducts';
import type { Category, Product } from '@/api/types';
import { ErrorState, ProductCard, ProductCardSkeleton } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { discountPercent } from '@/utils/format';

// Module-level (not recreated per render) so ProductCard's memo() comparison
// sees a stable onPress reference instead of a new closure every render.
function openProduct(product: Product) {
  router.push(`/product/${product.id}`);
}

const CategoryPill = memo(function CategoryPill({ category }: { category: Category }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push(`/category/${category.slug}`)}
      className="w-24 items-center gap-xs mr-md"
    >
      <View className="w-16 h-16 rounded-full bg-surface items-center justify-center overflow-hidden">
        <Feather name="grid" size={22} color={colors.muted} />
      </View>
      <Text className="text-[12px] font-medium text-text text-center" numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
});

const ProductRail = memo(function ProductRail({ title, products }: { title: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <View className="gap-md mb-2xl">
      <Text className="text-h3 font-semibold text-text px-lg">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-lg gap-md">
        {products.map((product) => (
          <View key={product.id} className="w-40">
            <ProductCard product={product} onPress={openProduct} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

export default function HomeScreen() {
  const categoriesQuery = useCategories();
  const productsQuery = useInfiniteProducts();
  const { products: recentlyViewed } = useRecentlyViewedProducts();
  const colors = useThemeColors();

  const allProducts = useMemo(
    () => (productsQuery.data?.pages ?? []).flatMap((p) => p.products),
    [productsQuery.data]
  );

  const popularCategories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => b._count.products - a._count.products).slice(0, 8),
    [categoriesQuery.data]
  );

  const offers = useMemo(
    () => allProducts.filter((p) => discountPercent(p.price, p.mrp) !== null).slice(0, 10),
    [allProducts]
  );

  const isRefreshing = (productsQuery.isRefetching || categoriesQuery.isRefetching) && !productsQuery.isFetchingNextPage;

  const onRefresh = () => {
    productsQuery.refetch();
    categoriesQuery.refetch();
  };

  const header = (
    <View>
      <View className="flex-row items-center justify-between px-lg pt-sm pb-lg">
        <View>
          <Text className="text-[13px] font-semibold uppercase tracking-wide text-primary">MotoXPlus</Text>
          <Text className="text-h2 font-bold text-text">Dealer Catalog</Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
          <Feather name="bell" size={22} color={colors.text} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/search')}
        className="mx-lg mb-2xl h-12 rounded-md bg-surface flex-row items-center px-md gap-sm"
      >
        <Feather name="search" size={18} color={colors.muted} />
        <Text className="text-[15px] text-muted">Search parts, brands, part numbers…</Text>
      </Pressable>

      <View className="mx-lg mb-2xl rounded-lg bg-secondary px-xl py-2xl">
        <Text className="text-[13px] font-semibold uppercase tracking-wide text-primary mb-xs">
          Genuine Parts, Direct to Dealer
        </Text>
        <Text className="text-h2 font-bold text-secondary-foreground mb-xs">
          Order in minutes,{'\n'}delivered nationwide.
        </Text>
      </View>

      {categoriesQuery.isLoading ? (
        <View className="px-lg mb-2xl">
          <ActivityIndicator color={colors.text} />
        </View>
      ) : popularCategories.length > 0 ? (
        <View className="gap-md mb-2xl">
          <Text className="text-h3 font-semibold text-text px-lg">Popular Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-lg">
            {popularCategories.map((c) => (
              <CategoryPill key={c.id} category={c} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ProductRail title="Offers" products={offers} />
      <ProductRail title="Recently Viewed" products={recentlyViewed} />

      <Text className="text-h3 font-semibold text-text px-lg mb-md">New Arrivals</Text>
    </View>
  );

  if (productsQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ErrorState error={productsQuery.error} onRetry={() => productsQuery.refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {productsQuery.isLoading ? (
        <ScrollView contentContainerClassName="p-lg">
          <View className="flex-row flex-wrap gap-md">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} className="w-[47%]">
                <ProductCardSkeleton />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={allProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperClassName="px-lg gap-md"
          contentContainerClassName="gap-md pb-2xl"
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View className="flex-1">
              <ProductCard product={item} onPress={openProduct} />
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
              productsQuery.fetchNextPage();
            }
          }}
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? <ActivityIndicator className="py-lg" color={colors.text} /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}
