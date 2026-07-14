import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useInfiniteProducts } from '@/api/hooks/useProducts';
import type { Product } from '@/api/types';
import { EmptyState, ErrorState, ProductCard, ProductCardSkeleton } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';

// Module-level so ProductCard's memo() sees a stable onPress reference.
function openProduct(product: Product) {
  router.push(`/product/${product.id}`);
}

export default function CategoryProductsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const colors = useThemeColors();

  const query = useInfiniteProducts({ category: slug });
  const products = useMemo(() => query.data?.pages.flatMap((p) => p.products) ?? [], [query.data]);

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
    </SafeAreaView>
  );
}
