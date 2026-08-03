import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideOutRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct } from '@/api/hooks/useProducts';
import { Image } from '@/components/ui';
import { useAuth } from '@/auth/useAuth';
import { canAccessDealerApp } from '@/auth/access';
import { BlurredPrice, Button, EmptyState, SkeletonListRow } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { useWishlistHasHydrated, useWishlistStore, type WishlistItem } from '@/stores/wishlistStore';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';

const WishlistRow = memo(function WishlistRow({ item, isDealerApproved }: { item: WishlistItem; isDealerApproved: boolean }) {
  const remove = useWishlistStore((s) => s.remove);
  const productQuery = useProduct(item.productId);
  const addToCart = useAddToCart();

  return (
    // Plain View (not Pressable) at the row level: Pressable defaults
    // accessible={true}, which on iOS VoiceOver collapses the whole subtree
    // into one focus stop — the Remove and Add buttons below would become
    // unreachable by swipe navigation if they were nested inside an
    // accessible "navigate to product" Pressable instead of siblings of it.
    <Animated.View exiting={SlideOutRight.duration(200)} style={styles.row}>
      <Pressable
        onPress={() => router.push(`/product/${item.productId}`)}
        style={styles.rowMain}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <Image source={getImageSource(item.imageUrl)} style={styles.image} cachePolicy="memory-disk" recyclingKey={item.productId} />
        <View style={styles.rowText}>
          <Text style={styles.brand}>{item.brand}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <BlurredPrice price={item.price} isDealerApproved={isDealerApproved} />
        </View>
      </Pressable>
      <View style={styles.rowActions}>
        <Pressable
          onPress={() => {
            HapticService.medium();
            remove(item.productId);
          }}
          hitSlop={13}
          accessibilityRole="button"
          accessibilityLabel="Remove from wishlist"
        >
          <Feather name="trash-2" size={18} color={colors.red} />
        </Pressable>
        <Button
          label="Add"
          variant="ghost"
          disabled={!productQuery.data || productQuery.data.stock <= 0}
          loading={addToCart.isPending}
          style={styles.addButton}
          onPress={() => {
            if (!productQuery.data) return;
            HapticService.light();
            addToCart.mutate({
              payload: { productId: item.productId, quantity: productQuery.data.moq },
              product: productQuery.data,
            });
          }}
        />
      </View>
    </Animated.View>
  );
});

export default function WishlistScreen() {
  const items = useWishlistStore((s) => s.items);
  const sortedItems = useMemo(() => [...items].sort((a, b) => b.addedAt - a.addedAt), [items]);
  const hasHydrated = useWishlistHasHydrated();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, dealer } = useAuth();
  const isDealerApproved = canAccessDealerApp(user, dealer);

  // The wishlist itself is a device-local list (see stores/wishlistStore.ts)
  // with no server endpoint to refetch — what's actually stale here is each
  // row's live product data (price/stock), fetched independently per row via
  // useProduct. Invalidating that query family refetches every mounted row
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
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonListRow key={i} />
        ))}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <WishlistRow item={item} isDealerApproved={isDealerApproved} />}
        contentContainerStyle={sortedItems.length === 0 ? styles.emptyContent : undefined}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.red} colors={[colors.red]} />}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  emptyContent: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.card },
  rowText: { flex: 1, gap: 4 },
  brand: { fontFamily: fonts.body.medium, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  name: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  rowActions: { alignItems: 'flex-end', gap: 8 },
  addButton: { height: 36, paddingHorizontal: 16 },
});
