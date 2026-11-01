import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import type { Category } from '@/api/types';
import { useGridColumns } from '@/hooks/use-grid-columns';
import { CategoryCard } from '@/src/components/catalog/CategoryCard';
import { EmptyState, ErrorState, SkeletonProductCard } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { HapticService } from '@/utils/haptics';

export default function CategoriesScreen() {
  const columns = useGridColumns();
  const { data: categories, isLoading, isError, error, refetch, isRefetching } = useCategories();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
        <PageHeader title="Categories" subtitle="Browse the catalog by part type." />
      </Animated.View>

      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.cell}>
              <SkeletonProductCard />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          key={`grid-${columns}`}
          data={categories ?? []}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          contentContainerStyle={[styles.listContent, (categories ?? []).length === 0 && styles.emptyContent]}
          onRefresh={() => {
            HapticService.light();
            refetch();
          }}
          refreshing={isRefetching && !isLoading}
          renderItem={({ item }: { item: Category }) => (
            <View style={styles.cell}>
              <CategoryCard category={item} />
            </View>
          )}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 28, letterSpacing: -0.42, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  listContent: { paddingHorizontal: 8, paddingBottom: 24 },
  emptyContent: { flexGrow: 1 },
  cell: { width: '50%', padding: 8 },
});
