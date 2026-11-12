import { zodResolver } from '@hookform/resolvers/zod';
import Feather from '@expo/vector-icons/Feather';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDealerAccount } from '@/api/hooks/useDealerAccount';
import { useCart } from '@/api/hooks/useCart';
import { useDealerSummary } from '@/api/hooks/useDealerSummary';
import { useCreateOrder } from '@/api/hooks/useOrders';
import { getErrorMessage } from '@/api/errors';
import type { PaymentType, ShippingServiceabilityResponse } from '@/api/types';
import { checkoutSchema, type CheckoutFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { CheckoutBottomBar } from '@/src/components/checkout/CheckoutBottomBar';
import { CheckoutField } from '@/src/components/checkout/CheckoutField';
import { FormSkeleton } from '@/src/components/checkout/FormSkeleton';
import { InlineBanner } from '@/src/components/checkout/InlineBanner';
import { PaymentOptionRow } from '@/src/components/checkout/PaymentOptionRow';
import { PincodeServiceability } from '@/src/components/checkout/PincodeServiceability';
import { ResultLayout } from '@/src/components/checkout/ResultLayout';
import { ScreenTopBar, TOP_BAR_HEIGHT } from '@/src/components/checkout/ScreenTopBar';
import { SummaryRow } from '@/src/components/checkout/SummaryRow';
import { Button } from '@/src/components/ui/Button';
import { GroupedList } from '@/src/components/ui/GroupedList';
import { LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { colors, font, screenPaddingX, sectionGap, space } from '@/src/theme';
import { webOrigin } from '@/config/env';
import { calculateCartTotals } from '@/utils/cartTotals';
import { formatCurrency, normalizeMobileNumber } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

// Dealer orders are prepaid only — the backend rejects COD at creation, so
// exactly these two Razorpay options are offered.
type OnlinePaymentType = Exclude<PaymentType, 'COD'>;

export default function CheckoutScreen() {
  const { dealer } = useAuth();
  const { data: dealerAccount } = useDealerAccount();
  const { data: cart, isLoading: isCartLoading } = useCart();
  const { summary: dealerSummary } = useDealerSummary();
  const createOrder = useCreateOrder();
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useLargeTitleScroll();

  const [paymentType, setPaymentType] = useState<OnlinePaymentType>('FULL_100');
  const [formError, setFormError] = useState<string | null>(null);
  const [barHeight, setBarHeight] = useState(0);

  const items = cart?.items ?? [];
  const freeItemCount = items.filter((i) => i.isSchemeItem).reduce((sum, i) => sum + i.quantity, 0);

  const totals = useMemo(() => {
    const base = calculateCartTotals(cart?.items ?? []);
    const amountDue = paymentType === 'ADVANCE_20' ? base.grandTotal * 0.2 : base.grandTotal;
    return { ...base, amountDue };
  }, [cart, paymentType]);

  const advanceAmount = totals.grandTotal * 0.2;
  const paymentOptions: { label: string; value: OnlinePaymentType; hint: string }[] = [
    {
      label: 'Full Payment via Razorpay',
      value: 'FULL_100',
      hint: 'Pay 100% now · priority dispatch',
    },
    {
      label: '20% Advance via Razorpay',
      value: 'ADVANCE_20',
      hint: `Pay ${formatCurrency(advanceAmount)} now · remaining 80% (${formatCurrency(totals.grandTotal - advanceAmount)}) in cash on delivery · standard dispatch`,
    },
  ];

  // Advisory only — the backend is the authority on credit and will reject
  // the order server-side if it actually enforces the limit. This just
  // surfaces it before the tap instead of as a surprise error after.
  const projectedOutstanding = dealerSummary.outstandingBalance + totals.amountDue;
  const creditWarning =
    dealer && dealer.creditLimit > 0 && projectedOutstanding > dealer.creditLimit
      ? `This order takes your outstanding balance to ${formatCurrency(projectedOutstanding)}, over your ${formatCurrency(dealer.creditLimit)} credit limit.`
      : null;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
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

  const watchedPincode = watch('deliveryPincode');

  const handleServiceabilityResult = (result: ShippingServiceabilityResponse | null) => {
    // Auto-fill City from the pincode lookup when the dealer hasn't typed one
    // (the Delhivery response has no full state name, only a code — so State
    // stays manual). Mirrors the web checkout's PincodeChecker behavior. The
    // "outside courier coverage" notice itself is the caption PincodeServiceability
    // renders under the pincode field.
    if (result?.city && !getValues('deliveryCity')?.trim()) {
      setValue('deliveryCity', result.city, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    setFormError(null);
    try {
      const { order } = await createOrder.mutateAsync({ ...values, paymentType });
      HapticService.success();

      // Order is PENDING until paid. Hand off
      // to the native Razorpay checkout screen (create Razorpay order → SDK →
      // server-side verify). See app/order/[id]/pay.tsx.
      router.replace(`/order/${order.id}/pay`);
    } catch (err) {
      // No HapticService.error() here: this failure already passed through
      // apiClient's response interceptor, which fires the error haptic once
      // for every surfaced API/payment failure app-wide. Adding one here too
      // would double-fire for the same tap.
      setFormError(getErrorMessage(err, 'Could not place order'));
    }
  };

  const onInvalid = () => HapticService.error();

  const topInset = insets.top + TOP_BAR_HEIGHT;

  if (!isCartLoading && items.length === 0) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ResultLayout
          icon={<Feather name="shopping-bag" size={48} color={colors.ink3} />}
          title="Your cart is empty"
          actions={<Button label="Browse products" variant="primary" fullWidth onPress={() => router.replace('/(tabs)')} />}
        />
        <ScreenTopBar title="Checkout" scrollY={scrollY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingTop: topInset, paddingBottom: barHeight + sectionGap },
          ]}
        >
          <LargeTitleHeader title="Checkout" />

          {isCartLoading ? (
            <View style={styles.body}>
              <FormSkeleton />
            </View>
          ) : (
            <View style={styles.body}>
              <GroupedList header="Delivery address">
                <CheckoutField control={control} name="deliveryName" label="Contact name" textContentType="name" />
                <CheckoutField
                  control={control}
                  name="deliveryPhone"
                  label="Phone"
                  keyboardType="phone-pad"
                  maxLength={10}
                  textContentType="telephoneNumber"
                />
                <CheckoutField control={control} name="deliveryAddress" label="Address" multiline numberOfLines={2} />
                <View style={styles.splitRow}>
                  <CheckoutField control={control} name="deliveryCity" label="City" containerStyle={styles.half} />
                  <View style={styles.verticalSeparator} />
                  <CheckoutField control={control} name="deliveryState" label="State" containerStyle={styles.half} />
                </View>
                <CheckoutField
                  control={control}
                  name="deliveryPincode"
                  label="Pincode"
                  keyboardType="number-pad"
                  maxLength={6}
                >
                  <PincodeServiceability pincode={watchedPincode} onResult={handleServiceabilityResult} />
                </CheckoutField>
                <CheckoutField control={control} name="notes" label="Order notes (optional)" />
              </GroupedList>

              <GroupedList header="Payment method">
                {paymentOptions.map((opt) => (
                  <PaymentOptionRow
                    key={opt.value}
                    label={opt.label}
                    hint={opt.hint}
                    selected={paymentType === opt.value}
                    onSelect={() => setPaymentType(opt.value)}
                  />
                ))}
              </GroupedList>

              <GroupedList header="Order summary">
                <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
                <SummaryRow label="GST" value={formatCurrency(totals.gstAmount)} />
                {freeItemCount > 0 && (
                  <SummaryRow
                    label="GST Benefit"
                    value={`${freeItemCount} free item${freeItemCount > 1 ? 's' : ''}`}
                    tone="success"
                  />
                )}
                <SummaryRow
                  label="Delivery charges"
                  value={totals.shipping === 0 ? 'Free' : formatCurrency(totals.shipping)}
                />
                <SummaryRow label="Total" value={formatCurrency(totals.grandTotal)} strong />
                {paymentType === 'ADVANCE_20' && (
                  <SummaryRow label="Due now (20%)" value={formatCurrency(totals.amountDue)} strong />
                )}
              </GroupedList>

              <Pressable
                onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/cancellation-policy`)}
                accessibilityRole="link"
                accessibilityLabel="Cancellation policy. 2% charge before dispatch, 20% after, not cancellable once delivered."
                style={styles.footnoteLink}
              >
                <Text style={styles.footnote} maxFontSizeMultiplier={1.2}>
                  Cancellation: 2% charge before dispatch · 20% after · not cancellable once delivered.{' '}
                  <Text style={styles.footnoteAction}>View policy</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.ScrollView>

        {!isCartLoading && (
          <CheckoutBottomBar onHeightChange={setBarHeight}>
            {creditWarning && <InlineBanner title="Credit limit" message={creditWarning} />}
            {formError && <InlineBanner title="Could not place order" message={formError} />}
            <Button
              label="Place order & pay"
              variant="primary"
              fullWidth
              onPress={handleSubmit(onSubmit, onInvalid)}
              loading={isSubmitting || createOrder.isPending}
            />
          </CheckoutBottomBar>
        )}
      </KeyboardAvoidingView>
      <ScreenTopBar title="Checkout" scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { gap: sectionGap },
  body: { paddingHorizontal: screenPaddingX, gap: sectionGap },
  splitRow: { flexDirection: 'row', alignItems: 'stretch' },
  half: { flex: 1 },
  verticalSeparator: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: space.sm,
  },
  footnoteLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg, marginTop: -space.lg },
  footnote: { ...font(400), fontSize: 13, lineHeight: 18, color: colors.ink2 },
  footnoteAction: { ...font(600), color: colors.link },
});
