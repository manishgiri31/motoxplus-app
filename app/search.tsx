import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useInfiniteProducts, useProductSearch } from '@/api/hooks/useProducts';
import type { Product, ProductSuggestion } from '@/api/types';
import { EmptyState, ProductCard } from '@/components/ui';

// Module-level so ProductCard's memo() sees a stable onPress reference.
function openProduct(product: Product) {
  router.push(`/product/${product.id}`);
}

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
      className="flex-row items-center gap-md px-lg py-md border-b border-graytone-100 active:bg-graytone-50"
    >
      {suggestion.imageUrl ? (
        <Image
          source={{ uri: suggestion.imageUrl }}
          className="w-10 h-10 rounded-md bg-graytone-100"
          cachePolicy="memory-disk"
        />
      ) : (
        <View className="w-10 h-10 rounded-md bg-graytone-100 items-center justify-center">
          <Feather name="box" size={16} color="#A3A3A3" />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-[14px] font-medium text-black" numberOfLines={1}>
          {suggestion.name}
        </Text>
        <Text className="text-[12px] text-graytone-500">
          {suggestion.categoryName} · {suggestion.brand}
        </Text>
      </View>
    </Pressable>
  );
});

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  const suggestionsQuery = useProductSearch(debouncedQuery);
  const resultsQuery = useInfiniteProducts({ search: debouncedQuery.trim().length >= 2 ? debouncedQuery : undefined });

  const results = resultsQuery.data?.pages.flatMap((p) => p.products) ?? [];
  const showSuggestions = debouncedQuery.trim().length >= 2 && debouncedQuery.trim().length < 4;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-sm px-lg py-md border-b border-graytone-100">
        <View className="flex-1 flex-row items-center h-11 rounded-md bg-graytone-100 px-md gap-sm">
          <Feather name="search" size={18} color="#737373" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search parts, brands, part numbers…"
            placeholderTextColor="#A3A3A3"
            className="flex-1 text-[15px] text-black"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={16} color="#737373" />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()}>
          <Text className="text-[15px] font-medium text-black">Cancel</Text>
        </Pressable>
      </View>

      {query.trim().length < 2 ? (
        <EmptyState icon="search" title="Search the catalog" message="Try a product name, brand, or part number." />
      ) : showSuggestions && suggestionsQuery.data ? (
        <FlatList
          data={suggestionsQuery.data.suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SuggestionRow suggestion={item} />}
          ListEmptyComponent={<EmptyState icon="search" title="No matches" message={`Nothing found for "${query}"`} />}
        />
      ) : (
        <FlatList
          data={results}
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
            if (resultsQuery.hasNextPage && !resultsQuery.isFetchingNextPage) resultsQuery.fetchNextPage();
          }}
          ListFooterComponent={resultsQuery.isFetchingNextPage ? <ActivityIndicator className="py-lg" color="#0A0A0A" /> : null}
          ListEmptyComponent={
            !resultsQuery.isLoading ? (
              <EmptyState icon="search" title="No results" message={`Nothing found for "${query}"`} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
