import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canAccessDealerApp } from '@/auth/access';
import { useAuth } from '@/auth/useAuth';
import { useGridColumns } from '@/hooks/use-grid-columns';
import { WishlistTile } from '@/src/components/account/WishlistTile';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SkeletonProductCard } from '@/src/components/ui/Skeleton';
import { Toast } from '@/src/components/ui/Toast';
import { colors, motion, screenPaddingX, space } from '@/src/theme';
import { useWishlistHasHydrated, useWishlistStore } from '@/stores/wishlistStore';
import { HapticService } from '@/utils/haptics';

const GRID_GAP = space.md;

export default function WishlistScreen() {
  const items = useWishlistStore((s) => s.items);
  const sortedItems = useMemo(() => [...items].sort((a, b) => b.addedAt - a.addedAt), [items]);
  const hasHydrated = useWishlistHasHydrated();
  const queryClient = useQueryClient();
  const columns = useGridColumns();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { user, dealer } = useAuth();
  const isDealerApproved = canAccessDealerApp(user, dealer);

  // The wishlist itself is a device-local list (see stores/wishlistStore.ts)
  // with no server endpoint to refetch — what's actually stale here is each
  // tile's live product data (price/stock), fetched independently per tile via
  // useProduct. Invalidating that query family refetches every mounted tile
  // through the same hook they already use, rather than inventing a new
  // fetch path.
  const onRefresh = async () => {
    if (isRefreshing) return;
    HapticService.light();
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['products', 'detail'] });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!hasHydrated) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.skeletonGrid}>
          {Array.from({ length: columns * 2 }).map((_, i) => (
            <View key={i} style={[styles.skeletonCell, { width: `${100 / columns}%` }]}>
              <SkeletonProductCard />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        // FlatList can't change numColumns in place.
        key={columns}
        numColumns={columns}
        data={sortedItems}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => (
          <Animated.View exiting={FadeOut.duration(motion.duration.fast)} style={[styles.cell, { width: `${100 / columns}%` }]}>
            <WishlistTile item={item} isDealerApproved={isDealerApproved} onNotify={setToastMessage} />
          </Animated.View>
        )}
        contentContainerStyle={sortedItems.length === 0 ? styles.emptyContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.link} colors={[colors.link]} />}
        ListEmptyComponent={
          <EmptyState
            icon="heart"
            title="Your wishlist is empty"
            message="Items saved for later are stored on this device."
            actionLabel="Browse products"
            onAction={() => router.push('/(tabs)')}
          />
        }
      />
      {toastMessage && <Toast message={toastMessage} onHide={() => setToastMessage(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  emptyContent: { flexGrow: 1 },
  // Cells carry half the gap each so the outer edge lands on the 20px screen margin.
  listContent: { paddingHorizontal: screenPaddingX - GRID_GAP / 2, paddingTop: space.xl, paddingBottom: space.x5 },
  cell: { paddingHorizontal: GRID_GAP / 2, paddingBottom: GRID_GAP },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: screenPaddingX - GRID_GAP / 2,
    paddingTop: space.xl,
  },
  skeletonCell: { paddingHorizontal: GRID_GAP / 2, paddingBottom: GRID_GAP },
});
