import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrder } from '@/api/hooks/useOrders';
import type { OrderStatus } from '@/api/types';
import { Badge, type BadgeTone, Button, ErrorState } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatCurrency } from '@/utils/format';

const statusTone: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'brand',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

const STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return <Badge label="Order cancelled" tone="danger" />;
  }
  const currentIndex = STEPS.indexOf(status);
  return (
    <View className="flex-row items-center">
      {STEPS.map((step, i) => (
        <View key={step} className="flex-1 flex-row items-center">
          <View className={`w-3 h-3 rounded-full ${i <= currentIndex ? 'bg-primary' : 'bg-border'}`} />
          {i < STEPS.length - 1 && (
            <View className={`flex-1 h-0.5 ${i < currentIndex ? 'bg-primary' : 'bg-border'}`} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const colors = useThemeColors();

  if (isLoading || !order) {
    if (isError) {
      return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
          <ErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['bottom']}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView contentContainerClassName="p-lg gap-lg">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-h3 font-bold text-text">#{order.orderNumber}</Text>
            <Text className="text-[12px] text-muted">
              {new Date(order.createdAt).toLocaleString('en-IN')}
            </Text>
          </View>
          <Badge label={order.status} tone={statusTone[order.status]} />
        </View>

        <StatusTimeline status={order.status} />

        {order.shipment && (
          <Button
            label="Track shipment"
            variant="outline"
            onPress={() => router.push(`/order/${order.id}/tracking`)}
          />
        )}

        <View className="gap-md">
          <Text className="text-h3 font-semibold text-text">Items</Text>
          {order.items.map((item) => (
            <View key={item.id} className="flex-row justify-between border-b border-border pb-sm">
              <View className="flex-1 pr-md">
                <Text className="text-[14px] font-medium text-text" numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text className="text-[12px] text-muted">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text className="text-[14px] font-semibold text-text">{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View className="gap-sm">
          <Text className="text-h3 font-semibold text-text">Payment summary</Text>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-muted">Subtotal</Text>
            <Text className="text-[14px] text-text">{formatCurrency(order.subtotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-muted">GST</Text>
            <Text className="text-[14px] text-text">{formatCurrency(order.gstAmount)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-muted">Shipping</Text>
            <Text className="text-[14px] text-text">
              {order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)}
            </Text>
          </View>
          <View className="flex-row justify-between pt-sm border-t border-border">
            <Text className="text-[16px] font-bold text-text">Total</Text>
            <Text className="text-[16px] font-bold text-text">{formatCurrency(order.grandTotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[13px] text-muted">Paid</Text>
            <Text className="text-[13px] text-text">{formatCurrency(order.amountPaid)}</Text>
          </View>
          {order.amountDue > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-[13px] font-semibold text-warning">Amount due</Text>
              <Text className="text-[13px] font-semibold text-warning">{formatCurrency(order.amountDue)}</Text>
            </View>
          )}
        </View>

        {order.invoice && (
          <View className="p-lg rounded-md bg-surface gap-xs">
            <Text className="text-[13px] font-semibold text-text">Invoice #{order.invoice.invoiceNumber}</Text>
            <Text className="text-[12px] text-muted">
              A downloadable PDF isn&apos;t available in the app yet — you can share these details for now.
            </Text>
            <Button
              label="Share invoice details"
              size="sm"
              variant="outline"
              onPress={() =>
                Share.share({
                  message: `Invoice ${order.invoice!.invoiceNumber} for order #${order.orderNumber}\nTotal: ${formatCurrency(order.invoice!.grandTotal)}`,
                })
              }
            />
          </View>
        )}

        {order.shippingAddress && (
          <View className="gap-xs">
            <Text className="text-h3 font-semibold text-text">Delivery address</Text>
            <Text className="text-[14px] text-muted">{order.deliveryName}</Text>
            <Text className="text-[14px] text-muted">{order.shippingAddress}</Text>
            <Text className="text-[14px] text-muted">
              {order.deliveryCity}, {order.deliveryState} {order.deliveryPincode}
            </Text>
            <Text className="text-[14px] text-muted">{order.deliveryPhone}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
