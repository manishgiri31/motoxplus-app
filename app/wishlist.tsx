import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddToCart } from '@/api/hooks/useCart';
import { useProduct } from '@/api/hooks/useProducts';
import { Button, EmptyState, Image } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useWishlistStore, type WishlistItem } from '@/stores/wishlistStore';
import { formatCurrency } from '@/utils/format';

const WishlistRow = memo(function WishlistRow({ item }: { item: WishlistItem }) {
  const remove = useWishlistStore((s) => s.remove);
  const productQuery = useProduct(item.productId);
  const addToCart = useAddToCart();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={() => router.push(`/product/${item.productId}`)}
      className="flex-row items-center gap-md p-lg border-b border-border"
    >
      <Image
        source={item.imageUrl ? { uri: item.imageUrl } : undefined}
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
      <View className="gap-sm items-end">
        <Pressable onPress={() => remove(item.productId)} hitSlop={8}>
          <Feather name="trash-2" size={18} color={colors.danger} />
        </Pressable>
        <Button
          label="Add"
          size="sm"
          variant="outline"
          disabled={!productQuery.data || productQuery.data.stock <= 0}
          loading={addToCart.isPending}
          onPress={(e) => {
            e.stopPropagation();
            if (!productQuery.data) return;
            addToCart.mutate({
              payload: { productId: item.productId, quantity: productQuery.data.moq },
              product: productQuery.data,
            });
          }}
        />
      </View>
    </Pressable>
  );
});

export default function WishlistScreen() {
  const items = useWishlistStore((s) => s.items);
  const sortedItems = useMemo(() => [...items].sort((a, b) => b.addedAt - a.addedAt), [items]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      {items.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Your wishlist is empty"
          message="Items saved for later are stored on this device."
          actionLabel="Browse products"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.productId}
          renderItem={({ item }) => <WishlistRow item={item} />}
        />
      )}
    </SafeAreaView>
  );
}
