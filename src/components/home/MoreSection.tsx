import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Order, Product } from '@/api/types';
import { orderStatusBadgeTone, orderStatusLabel } from '@/constants/orderStatus';
import { CatalogProductCard } from '@/src/components/catalog/CatalogProductCard';
import { Button } from '@/src/components/ui/Button';
import { GroupedList, ListRow } from '@/src/components/ui/GroupedList';
import { Sheet } from '@/src/components/ui/Sheet';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { motion, screenPaddingX, textStyles } from '@/src/theme';
import { formatCurrency } from '@/utils/format';

export interface MoreSectionProps {
  recentOrders: Order[];
  recommended: Product[];
}

type Open = 'activity' | 'recommended' | null;

// Recent activity and Recommended for you are kept off the main scroll: two
// grouped rows, each opening a sheet with the full list.
export function MoreSection({ recentOrders, recommended }: MoreSectionProps) {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

  // Dismiss the sheet, then navigate once it has slid away.
  const closeThen = (go: () => void) => {
    close();
    setTimeout(go, motion.duration.base + 40);
  };

  if (recentOrders.length === 0 && recommended.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <GroupedList>
        {recentOrders.length > 0 ? (
          <ListRow
            label="Recent activity"
            value={`${recentOrders.length} ${recentOrders.length === 1 ? 'order' : 'orders'}`}
            icon="clock"
            chevron
            onPress={() => setOpen('activity')}
          />
        ) : null}
        {recommended.length > 0 ? (
          <ListRow
            label="Recommended for you"
            value={`${recommended.length} parts`}
            icon="shopping-bag"
            chevron
            onPress={() => setOpen('recommended')}
          />
        ) : null}
      </GroupedList>

      <Sheet visible={open === 'activity'} onClose={close} title="Recent activity" detents={[0.5, 0.9]} scrollable>
        <GroupedList>
          {recentOrders.map((order) => (
            <OrderRow key={order.id} order={order} onPress={() => closeThen(() => router.push(`/order/${order.id}`))} />
          ))}
        </GroupedList>
        <Button label="View all orders" variant="link" onPress={() => closeThen(() => router.push('/(tabs)/orders'))} />
      </Sheet>

      <Sheet visible={open === 'recommended'} onClose={close} title="Recommended for you" detents={[0.5, 0.9]} scrollable>
        <View style={styles.grid}>
          {recommended.map((product) => (
            <View key={product.id} style={styles.gridCell}>
              <CatalogProductCard product={product} />
            </View>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const items = order.items.length;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${orderStatusLabel[order.status]}, ${formatCurrency(order.grandTotal)}`}
      style={({ pressed }) => [styles.orderRow, pressed && styles.pressed]}
    >
      <View style={styles.orderText}>
        <Text style={styles.orderNumber} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          #{order.orderNumber}
        </Text>
        <Text style={styles.orderMeta} maxFontSizeMultiplier={1.2}>
          {date} · {items} {items === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <View style={styles.orderRight}>
        <Text style={styles.orderTotal} maxFontSizeMultiplier={1.2}>
          {formatCurrency(order.grandTotal)}
        </Text>
        <StatusBadge label={orderStatusLabel[order.status]} tone={orderStatusBadgeTone[order.status]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: screenPaddingX },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 10 },
  pressed: { opacity: 0.6 },
  orderText: { flex: 1, gap: 2 },
  orderNumber: { ...textStyles.headline },
  orderMeta: { ...textStyles.callout },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderTotal: { ...textStyles.calloutStrong },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { width: '47.5%' },
});
