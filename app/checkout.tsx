import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDealerAccount } from '@/api/hooks/useDealerAccount';
import { useCart } from '@/api/hooks/useCart';
import { useCreateOrder } from '@/api/hooks/useOrders';
import { useCreateRazorpayOrder } from '@/api/hooks/usePayments';
import { getErrorMessage } from '@/api/errors';
import type { PaymentType } from '@/api/types';
import { checkoutSchema, type CheckoutFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Button, Input } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatCurrency } from '@/utils/format';

const FREE_DELIVERY_THRESHOLD = 25000;

const paymentOptions: { label: string; value: PaymentType; hint: string }[] = [
  { label: 'Cash on Delivery', value: 'COD', hint: 'Pay when your order arrives' },
  { label: 'Pay 20% advance', value: 'ADVANCE_20', hint: 'Online — balance due on delivery' },
  { label: 'Pay in full', value: 'FULL_100', hint: 'Online — pay the full amount now' },
];

export default function CheckoutScreen() {
  const { dealer } = useAuth();
  const { data: dealerAccount } = useDealerAccount();
  const { data: cart } = useCart();
  const createOrder = useCreateOrder();
  const createRazorpayOrder = useCreateRazorpayOrder();
  const colors = useThemeColors();

  const [paymentType, setPaymentType] = useState<PaymentType>('COD');
  const [formError, setFormError] = useState<string | null>(null);

  const items = cart?.items ?? [];

  const totals = useMemo(() => {
    const cartItems = cart?.items ?? [];
    let subtotal = 0;
    let gstAmount = 0;
    for (const item of cartItems) {
      const unitPrice = item.variant?.price ?? item.product.price;
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;
      gstAmount += (lineSubtotal * item.product.gstRate) / 100;
    }
    const taxedTotal = subtotal + gstAmount;
    const shipping = taxedTotal >= FREE_DELIVERY_THRESHOLD ? 0 : Math.round(taxedTotal * 0.05 * 100) / 100;
    const grandTotal = taxedTotal + shipping;
    const amountDue = paymentType === 'ADVANCE_20' ? grandTotal * 0.2 : grandTotal;
    return { subtotal, gstAmount, shipping, grandTotal, amountDue };
  }, [cart, paymentType]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryName: '',
      deliveryPhone: '',
      deliveryAddress: '',
      deliveryCity: '',
      deliveryState: '',
      deliveryPincode: '',
      notes: '',
    },
  });

  useEffect(() => {
    const source = dealerAccount ?? dealer;
    if (!source) return;
    reset({
      deliveryName: dealerAccount?.ownerName ?? dealer?.ownerName ?? '',
      deliveryPhone: dealerAccount?.phone ?? dealer?.phone ?? '',
      deliveryAddress: dealerAccount?.address ?? dealer?.address ?? '',
      deliveryCity: dealerAccount?.city ?? dealer?.city ?? '',
      deliveryState: dealerAccount?.state ?? dealer?.state ?? '',
      deliveryPincode: dealerAccount?.pincode ?? dealer?.pincode ?? '',
      notes: '',
    });
    // Only re-run when the dealer profile identity changes, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerAccount?.ownerName, dealer?.id]);

  const onSubmit = async (values: CheckoutFormValues) => {
    setFormError(null);
    try {
      const { order, isCOD } = await createOrder.mutateAsync({ ...values, paymentType });

      if (isCOD) {
        router.replace(`/order/${order.id}`);
        return;
      }

      // Online payment: the Razorpay order is created for real against the
      // backend, but capturing payment needs the native Razorpay SDK, which
      // requires a custom dev client (not available under Expo Go) — see
      // the note in api/services/paymentService.ts.
      await createRazorpayOrder.mutateAsync(order.id);
      Alert.alert(
        'Order placed — payment pending',
        `Order #${order.orderNumber} is created with ${formatCurrency(totals.amountDue)} due. Complete online payment from the order details screen once the payment SDK is available in this build.`,
        [{ text: 'View order', onPress: () => router.replace(`/order/${order.id}`) }]
      );
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not place order'));
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['bottom']}>
        <Text className="text-muted">Your cart is empty.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="p-lg gap-lg" keyboardShouldPersistTaps="handled">
          <Text className="text-h3 font-semibold text-text">Delivery address</Text>
          <Controller
            control={control}
            name="deliveryName"
            render={({ field, fieldState }) => (
              <Input label="Contact name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="deliveryPhone"
            render={({ field, fieldState }) => (
              <Input label="Phone" keyboardType="phone-pad" maxLength={10} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="deliveryAddress"
            render={({ field, fieldState }) => (
              <Input label="Address" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} multiline numberOfLines={2} />
            )}
          />
          <View className="flex-row gap-md">
            <View className="flex-1">
              <Controller
                control={control}
                name="deliveryCity"
                render={({ field, fieldState }) => (
                  <Input label="City" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="deliveryState"
                render={({ field, fieldState }) => (
                  <Input label="State" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="deliveryPincode"
            render={({ field, fieldState }) => (
              <Input label="Pincode" keyboardType="number-pad" maxLength={6} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Input label="Order notes (optional)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
            )}
          />

          <Text className="text-h3 font-semibold text-text mt-md">Payment method</Text>
          <View className="gap-sm">
            {paymentOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setPaymentType(opt.value)}
                className={`flex-row items-center justify-between p-lg rounded-md border ${
                  paymentType === opt.value ? 'border-secondary bg-surface' : 'border-border'
                }`}
              >
                <View>
                  <Text className="text-[14px] font-semibold text-text">{opt.label}</Text>
                  <Text className="text-[12px] text-muted">{opt.hint}</Text>
                </View>
                {paymentType === opt.value && <Feather name="check-circle" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </View>

          <Text className="text-h3 font-semibold text-text mt-md">Order summary</Text>
          <View className="gap-sm">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-muted">Subtotal</Text>
              <Text className="text-[14px] text-text">{formatCurrency(totals.subtotal)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-muted">GST</Text>
              <Text className="text-[14px] text-text">{formatCurrency(totals.gstAmount)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-muted">Delivery charges</Text>
              <Text className="text-[14px] text-text">{totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)}</Text>
            </View>
            <View className="flex-row justify-between pt-sm border-t border-border">
              <Text className="text-[16px] font-bold text-text">Total</Text>
              <Text className="text-[16px] font-bold text-text">{formatCurrency(totals.grandTotal)}</Text>
            </View>
            {paymentType === 'ADVANCE_20' && (
              <View className="flex-row justify-between">
                <Text className="text-[13px] text-muted">Due now (20%)</Text>
                <Text className="text-[13px] font-semibold text-text">{formatCurrency(totals.amountDue)}</Text>
              </View>
            )}
          </View>

          {formError && <Text className="text-[13px] text-danger">{formError}</Text>}

          <Button
            label={paymentType === 'COD' ? 'Place order' : 'Place order & pay'}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting || createOrder.isPending || createRazorpayOrder.isPending}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
