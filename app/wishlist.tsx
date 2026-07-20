import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct } from '@/api/hooks/useProducts';
import { Button, EmptyState, Image } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useWishlistStore, type WishlistItem } from '@/stores/wishlistStore';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { getImageSource } from '@/utils/image';

const WishlistRow = memo(function WishlistRow({ item }: { item: WishlistItem }) {
  const remove = useWishlistStore((s) => s.remove);
  const productQuery = useProduct(item.productId);
  const addToCart = useAddToCart();
  const colors = useThemeColors();

  return (
    // Plain View (not Pressable) at the row level: Pressable defaults
    // accessible={true}, which on iOS VoiceOver collapses the whole subtree
    // into one focus stop — the Remove and Add buttons below would become
    // unreachable by swipe navigation if they were nested inside an
    // accessible "navigate to product" Pressable instead of siblings of it.
    <View className="flex-row items-center gap-md p-lg border-b border-border">
      <Pressable
        onPress={() => router.push(`/product/${item.productId}`)}
        className="flex-1 flex-row items-center gap-md"
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatCurrency(item.price)}`}
      >
        <Image
          source={getImageSource(item.imageUrl)}
          className="w-16 h-16 rounded-md bg-surface"
          cachePolicy="memory-disk"
          recyclingKey={item.productId}
        />
        <View className="flex-1 gap-xs">
          <Text className="text-[13px] font-medium text-muted uppercase">{item.brand}</Text>
          <Text className="text-[14px] font-semibold text-text" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-[14px] font-bold text-text">{formatCurrency(item.price)}</Text>
        </View>
      </Pressable>
      <View className="gap-sm items-end">
        <Pressable
          onPress={() => {
            HapticService.medium();
            remove(item.productId);
          }}
          hitSlop={13}
          accessibilityRole="button"
          accessibilityLabel="Remove from wishlist"
        >
          <Feather name="trash-2" size={18} color={colors.danger} />
        </Pressable>
        <Button
          label="Add"
          size="sm"
          variant="outline"
          disabled={!productQuery.data || productQuery.data.stock <= 0}
          loading={addToCart.isPending}
          accessibilityLabel={`Add ${item.name} to cart`}
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
    </View>
  );
});

export default function WishlistScreen() {
  const items = useWishlistStore((s) => s.items);
  const sortedItems = useMemo(() => [...items].sort((a, b) => b.addedAt - a.addedAt), [items]);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <WishlistRow item={item} />}
        contentContainerClassName={sortedItems.length === 0 ? 'flex-1' : undefined}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
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
