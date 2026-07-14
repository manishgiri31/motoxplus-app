import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import type { Category } from '@/api/types';
import { EmptyState, ErrorState } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function CategoriesScreen() {
  const { data: categories, isLoading, isError, error, refetch, isRefetching } = useCategories();
  const colors = useThemeColors();

  const renderItem = ({ item }: { item: Category }) => (
    <Pressable
      onPress={() => router.push(`/category/${item.slug}`)}
      className="flex-1 m-xs bg-card border border-border rounded-lg p-lg gap-sm active:opacity-70"
    >
      <View className="w-12 h-12 rounded-full bg-surface items-center justify-center">
        <Feather name="grid" size={20} color={colors.text} />
      </View>
      <Text className="text-[15px] font-semibold text-text" numberOfLines={2}>
        {item.name}
      </Text>
      <Text className="text-[12px] text-muted">{item._count.products} products</Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-lg pt-sm pb-lg">
        <Text className="text-h2 font-bold text-text">Categories</Text>
      </View>

      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={categories ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerClassName="px-sm pb-2xl"
          refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} />}
          renderItem={renderItem}
          ListEmptyComponent={
            !isLoading ? <EmptyState icon="grid" title="No categories yet" /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}
