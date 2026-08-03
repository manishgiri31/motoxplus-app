import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDealerAccount } from '@/api/hooks/useDealerAccount';
import { useCart } from '@/api/hooks/useCart';
import { useCreateOrder } from '@/api/hooks/useOrders';
import { useCreateRazorpayOrder } from '@/api/hooks/usePayments';
import { getErrorMessage } from '@/api/errors';
import type { PaymentType } from '@/api/types';
import { checkoutSchema, type CheckoutFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Button } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { ONLINE_PAYMENTS_ENABLED } from '@/constants/features';
import { webOrigin } from '@/config/env';
import { calculateCartTotals } from '@/utils/cartTotals';
import { formatCurrency, normalizeMobileNumber } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

const paymentOptions: { label: string; value: PaymentType; hint: string; disabled?: boolean }[] = [
  { label: 'Cash on Delivery', value: 'COD', hint: 'Pay when your order arrives' },
  {
    label: 'Pay 20% advance',
    value: 'ADVANCE_20',
    hint: ONLINE_PAYMENTS_ENABLED ? 'Online — balance due on delivery' : 'Coming soon',
    disabled: !ONLINE_PAYMENTS_ENABLED,
  },
  {
    label: 'Pay in full',
    value: 'FULL_100',
    hint: ONLINE_PAYMENTS_ENABLED ? 'Online — pay the full amount now' : 'Coming soon',
    disabled: !ONLINE_PAYMENTS_ENABLED,
  },
];

export default function CheckoutScreen() {
  const { dealer } = useAuth();
  const { data: dealerAccount } = useDealerAccount();
  const { data: cart, isLoading: isCartLoading } = useCart();
  const createOrder = useCreateOrder();
  const createRazorpayOrder = useCreateRazorpayOrder();

  const [paymentType, setPaymentType] = useState<PaymentType>('COD');
  const [formError, setFormError] = useState<string | null>(null);

  const items = cart?.items ?? [];

  const totals = useMemo(() => {
    const base = calculateCartTotals(cart?.items ?? []);
    const amountDue = paymentType === 'ADVANCE_20' ? base.grandTotal * 0.2 : base.grandTotal;
    return { ...base, amountDue };
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
      deliveryPhone: normalizeMobileNumber(dealerAccount?.phone ?? dealer?.phone),
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
      // Order created — this is the "Order placed" moment for both the COD
      // and online-payment paths below; real payment capture isn't wired up
      // in this build (see the comment further down), so there's no separate
      // "payment success" event to fire yet.
      HapticService.success();

      if (isCOD) {
        router.replace({ pathname: '/order-placed', params: { orderId: order.id, orderNumber: order.orderNumber } });
        return;
      }

      // Online payment: the Razorpay order is created for real against the
      // backend, but capturing payment needs the native Razorpay SDK, which
      // requires a custom dev client (not available under Expo Go) — see
      // the note in api/services/paymentService.ts.
      await createRazorpayOrder.mutateAsync(order.id);
      router.replace({
        pathname: '/order-placed',
        params: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          pending: '1',
          amountDue: formatCurrency(totals.amountDue),
        },
      });
    } catch (err) {
      // No HapticService.error() here: this failure already passed through
      // apiClient's response interceptor, which fires the error haptic once
      // for every surfaced API/payment failure app-wide. Adding one here too
      // would double-fire for the same tap.
      setFormError(getErrorMessage(err, 'Could not place order'));
    }
  };

  const onInvalid = () => HapticService.error();

  if (isCartLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <Text style={styles.emptyText}>Your cart is empty.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Delivery address</Text>
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
          <View style={styles.row}>
            <View style={styles.flex}>
              <Controller
                control={control}
                name="deliveryCity"
                render={({ field, fieldState }) => (
                  <Input label="City" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
                )}
              />
            </View>
            <View style={styles.flex}>
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
            render={({ field }) => <Input label="Order notes (optional)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />}
          />

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Payment method</Text>
          <View style={styles.paymentList}>
            {paymentOptions.map((opt) => {
              const selected = paymentType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => !opt.disabled && setPaymentType(opt.value)}
                  disabled={opt.disabled}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: opt.disabled }}
                  accessibilityLabel={opt.label}
                  accessibilityHint={opt.hint}
                  style={[styles.paymentCard, selected && styles.paymentCardSelected, opt.disabled && styles.paymentCardDisabled]}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
                  <View style={styles.paymentText}>
                    <Text style={[styles.paymentLabel, opt.disabled && styles.paymentLabelDisabled]}>{opt.label}</Text>
                    <Text style={styles.paymentHint}>{opt.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/cancellation-policy`)}
            accessibilityRole="link"
            accessibilityLabel="Cancellation policy"
          >
            <Text style={styles.policyLine}>
              Cancellation: 2% charge before dispatch · 20% after · not cancellable once delivered.{' '}
              <Text style={styles.policyLink}>View policy</Text>
            </Text>
          </Pressable>

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Order summary</Text>
          <View style={styles.summary}>
            <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <SummaryRow label="GST" value={formatCurrency(totals.gstAmount)} />
            <SummaryRow label="Delivery charges" value={totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.grandTotal)}</Text>
            </View>
            {paymentType === 'ADVANCE_20' && <SummaryRow label="Due now (20%)" value={formatCurrency(totals.amountDue)} accent />}
          </View>

          {formError && <Text style={styles.error}>{formError}</Text>}

          <Button
            label={paymentType === 'COD' ? 'Place order' : 'Place order & pay'}
            variant="brand"
            fullWidth
            onPress={handleSubmit(onSubmit, onInvalid)}
            loading={isSubmitting || createOrder.isPending || createRazorpayOrder.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, accent && styles.accent]}>{label}</Text>
      <Text style={[styles.summaryValue, accent && styles.accent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  content: { padding: 16, gap: 16 },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  sectionSpacing: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 12 },
  paymentList: { gap: 12 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.card,
  },
  paymentCardSelected: { borderColor: colors.red, backgroundColor: colors.redSoft },
  paymentCardDisabled: { opacity: 0.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.red },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  paymentText: { flex: 1 },
  paymentLabel: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  paymentLabelDisabled: { color: colors.muted },
  paymentHint: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  policyLine: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, lineHeight: 17 },
  policyLink: { fontFamily: fonts.body.semiBold, color: colors.red },
  summary: { gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  summaryValue: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.ink },
  accent: { color: colors.red, fontFamily: fonts.body.semiBold },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  totalLabel: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  error: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.red },
});
