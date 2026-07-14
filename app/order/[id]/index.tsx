import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrder } from '@/api/hooks/useOrders';
import type { OrderStatus } from '@/api/types';
import { Badge, type BadgeTone, Button, ErrorState } from '@/components/ui';
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
          <View className={`w-3 h-3 rounded-full ${i <= currentIndex ? 'bg-brandred-500' : 'bg-graytone-200'}`} />
          {i < STEPS.length - 1 && (
            <View className={`flex-1 h-0.5 ${i < currentIndex ? 'bg-brandred-500' : 'bg-graytone-200'}`} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);

  if (isLoading || !order) {
    if (isError) {
      return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
          <ErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['bottom']}>
        <ActivityIndicator color="#0A0A0A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView contentContainerClassName="p-lg gap-lg">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-h3 font-bold text-black">#{order.orderNumber}</Text>
            <Text className="text-[12px] text-graytone-500">
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
          <Text className="text-h3 font-semibold text-black">Items</Text>
          {order.items.map((item) => (
            <View key={item.id} className="flex-row justify-between border-b border-graytone-100 pb-sm">
              <View className="flex-1 pr-md">
                <Text className="text-[14px] font-medium text-black" numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text className="text-[12px] text-graytone-500">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text className="text-[14px] font-semibold text-black">{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View className="gap-sm">
          <Text className="text-h3 font-semibold text-black">Payment summary</Text>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-graytone-600">Subtotal</Text>
            <Text className="text-[14px] text-black">{formatCurrency(order.subtotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-graytone-600">GST</Text>
            <Text className="text-[14px] text-black">{formatCurrency(order.gstAmount)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[14px] text-graytone-600">Shipping</Text>
            <Text className="text-[14px] text-black">
              {order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)}
            </Text>
          </View>
          <View className="flex-row justify-between pt-sm border-t border-graytone-100">
            <Text className="text-[16px] font-bold text-black">Total</Text>
            <Text className="text-[16px] font-bold text-black">{formatCurrency(order.grandTotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[13px] text-graytone-500">Paid</Text>
            <Text className="text-[13px] text-black">{formatCurrency(order.amountPaid)}</Text>
          </View>
          {order.amountDue > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-[13px] font-semibold text-warning">Amount due</Text>
              <Text className="text-[13px] font-semibold text-warning">{formatCurrency(order.amountDue)}</Text>
            </View>
          )}
        </View>

        {order.invoice && (
          <View className="p-lg rounded-md bg-graytone-50 gap-xs">
            <Text className="text-[13px] font-semibold text-black">Invoice #{order.invoice.invoiceNumber}</Text>
            <Text className="text-[12px] text-graytone-500">
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
            <Text className="text-h3 font-semibold text-black">Delivery address</Text>
            <Text className="text-[14px] text-graytone-600">{order.deliveryName}</Text>
            <Text className="text-[14px] text-graytone-600">{order.shippingAddress}</Text>
            <Text className="text-[14px] text-graytone-600">
              {order.deliveryCity}, {order.deliveryState} {order.deliveryPincode}
            </Text>
            <Text className="text-[14px] text-graytone-600">{order.deliveryPhone}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
