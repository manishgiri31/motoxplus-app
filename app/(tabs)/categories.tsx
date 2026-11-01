import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '@/api/hooks/useCategories';
import type { Category } from '@/api/types';
import { useGridColumns } from '@/hooks/use-grid-columns';
import { CategoryCard } from '@/src/components/catalog/CategoryCard';
import { CategoryCardSkeleton } from '@/src/components/catalog/CatalogSkeletons';
import { EmptyState, ErrorState } from '@/src/components/ui';
import { CompactTitleBar, LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { colors, screenPaddingX } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

// Half the 12pt gap between cells goes on each side of a cell; the list adds
// the rest so the grid's outer edge lands on the 20pt screen padding.
const GRID_GAP = 12;

type Item = Category | { id: string; placeholder: true };
const PLACEHOLDERS: Item[] = Array.from({ length: 6 }, (_, i) => ({ id: `placeholder-${i}`, placeholder: true }));

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const columns = useGridColumns();
  const { scrollY, onScroll } = useLargeTitleScroll();
  const { data: categories, isLoading, isError, error, refetch, isRefetching } = useCategories();

  const data: Item[] = isLoading ? PLACEHOLDERS : (categories ?? []);

  return (
    <View style={styles.screen}>
      <Animated.FlatList
        key={`grid-${columns}`}
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 8 },
          data.length === 0 && styles.emptyContent,
        ]}
        onRefresh={() => {
          HapticService.light();
          refetch();
        }}
        refreshing={isRefetching && !isLoading}
        ListHeaderComponent={
          <View style={styles.header}>
            <LargeTitleHeader title="Categories" scrollY={scrollY} numberOfLines={1} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.cell, { width: `${100 / columns}%` }]}>
            {'placeholder' in item ? <CategoryCardSkeleton /> : <CategoryCard category={item} />}
          </View>
        )}
        ListEmptyComponent={
          isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <EmptyState
              icon="grid"
              title="No categories yet"
              message="Categories will appear here once they're added to the catalog."
              actionLabel="Go to Home"
              onAction={() => router.push('/(tabs)')}
            />
          )
        }
      />
      <CompactTitleBar title="Categories" scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  // LargeTitleHeader pads itself by the screen margin, so the header sits
  // outside the list's grid padding.
  header: { marginHorizontal: -(screenPaddingX - GRID_GAP / 2), paddingBottom: 16 },
  listContent: { paddingHorizontal: screenPaddingX - GRID_GAP / 2, paddingBottom: 24 },
  emptyContent: { flexGrow: 1 },
  // Width is set per render from the column count, so a short last row keeps
  // its cells at column width instead of stretching.
  cell: { paddingHorizontal: GRID_GAP / 2, paddingBottom: GRID_GAP },
});
