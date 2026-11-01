import { router, useLocalSearchParams } from 'expo-router';

import { ResultLayout } from '@/src/components/checkout/ResultLayout';
import { SuccessCheck } from '@/src/components/checkout/SuccessCheck';
import { Button } from '@/src/components/ui/Button';

// COD-only confirmation screen. Prepaid orders skip it entirely: checkout
// routes them to /order/[id]/pay (native Razorpay checkout) and, once the
// payment is verified server-side, straight on to /order/[id].
export default function OrderPlacedScreen() {
  const { orderId, orderNumber } = useLocalSearchParams<{ orderId: string; orderNumber: string }>();

  return (
    <ResultLayout
      icon={<SuccessCheck />}
      title="Order placed"
      reference={`Order #${orderNumber}`}
      actions={
        <>
          <Button label="View order" variant="primary" fullWidth onPress={() => router.replace(`/order/${orderId}`)} />
          <Button label="Continue shopping" variant="link" hideChevron onPress={() => router.replace('/(tabs)')} />
        </>
      }
    />
  );
}
