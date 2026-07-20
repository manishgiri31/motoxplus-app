import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import type { Category } from '@/api/types';
import { CategoryCardSkeleton, EmptyState, ErrorState, Image } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';

export default function CategoriesScreen() {
  const { data: categories, isLoading, isError, error, refetch, isRefetching } = useCategories();
  const colors = useThemeColors();

  const renderItem = ({ item }: { item: Category }) => (
    <Pressable
      onPress={() => router.push(`/category/${item.slug}`)}
      className="flex-1 m-xs bg-card border border-border rounded-lg p-lg gap-sm active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item._count.products} products`}
    >
      {item.image ? (
        <Image source={getImageSource(item.image)} className="w-12 h-12 rounded-full bg-surface" cachePolicy="memory-disk" />
      ) : (
        <View className="w-12 h-12 rounded-full bg-surface items-center justify-center">
          <Feather name="grid" size={20} color={colors.text} />
        </View>
      )}
      <Text className="text-[15px] font-semibold text-text" numberOfLines={2}>
        {item.name}
      </Text>
      <Text className="text-[12px] text-muted">{item._count.products} products</Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Animated.View entering={FadeIn.duration(200)} className="px-lg pt-sm pb-lg">
        <Text className="text-h2 font-bold text-text">Categories</Text>
      </Animated.View>

      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <ScrollView contentContainerClassName="p-sm">
          <View className="flex-row flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} className="w-1/2">
                <CategoryCardSkeleton />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={categories ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerClassName={`px-sm pb-2xl ${(categories ?? []).length === 0 ? 'flex-1' : ''}`}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={() => {
                HapticService.light();
                refetch();
              }}
            />
          }
          renderItem={renderItem}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="grid"
                title="No categories yet"
                message="Categories will appear here once they're added to the catalog."
                actionLabel="Go to Home"
                onAction={() => router.push('/(tabs)')}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
