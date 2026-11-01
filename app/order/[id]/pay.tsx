import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrder } from '@/api/hooks/useOrders';
import { webOrigin } from '@/config/env';
import { useRazorpayPayment, type RazorpayPhase } from '@/hooks/useRazorpayPayment';
import { CancellationSheet } from '@/src/components/cancellation/CancellationSheet';
import { FormSkeleton } from '@/src/components/checkout/FormSkeleton';
import { InlineBanner } from '@/src/components/checkout/InlineBanner';
import { PayMethodRow } from '@/src/components/checkout/PayMethodRow';
import { PaymentProgress, type ProgressStep, type StepState } from '@/src/components/checkout/PaymentProgress';
import { ResultLayout } from '@/src/components/checkout/ResultLayout';
import { ScreenTopBar, TOP_BAR_HEIGHT } from '@/src/components/checkout/ScreenTopBar';
import { SuccessCheck } from '@/src/components/checkout/SuccessCheck';
import { Button } from '@/src/components/ui/Button';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { GroupedList } from '@/src/components/ui/GroupedList';
import { LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { colors, font, radii, screenPaddingX, sectionGap, space } from '@/src/theme';
import { formatCurrency } from '@/utils/format';

const BUSY_PHASES: RazorpayPhase[] = ['preparing', 'opening', 'verifying'];

const PHASE_COPY: Record<RazorpayPhase, string> = {
  idle: '',
  preparing: 'Preparing payment…',
  opening: 'Opening Razorpay…',
  verifying: 'Verifying payment…',
  verified: 'Payment successful',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
};

// The four steps the dealer sees, in order. Each in-flight phase of the
// Razorpay hook maps to one of them; 'verified' completes the last.
const STEP_LABELS = ['Preparing', 'Opening payment', 'Verifying', 'Successful'] as const;
const STEP_OF_PHASE: Partial<Record<RazorpayPhase, number>> = { preparing: 0, opening: 1, verifying: 2 };

function buildSteps(phase: RazorpayPhase, lastBusy: RazorpayPhase): ProgressStep[] {
  return STEP_LABELS.map((label, i) => {
    let state: StepState = 'pending';
    if (phase === 'verified') {
      state = 'done';
    } else if (phase === 'failed') {
      // The hook drops the phase it failed in, so the screen remembers the last busy one.
      const at = STEP_OF_PHASE[lastBusy] ?? 0;
      state = i < at ? 'done' : i === at ? 'failed' : 'pending';
    } else {
      const at = STEP_OF_PHASE[phase];
      if (at !== undefined) state = i < at ? 'done' : i === at ? 'active' : 'pending';
    }
    return { label, state };
  });
}

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const payment = useRazorpayPayment();
  const { phase } = payment;
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  // Lets the dealer open the Full / 20% chooser from the idle screen too
  // (e.g. arriving via "Complete payment" on the order page).
  const [showMethods, setShowMethods] = useState(false);
  const [lastBusy, setLastBusy] = useState<RazorpayPhase>('preparing');
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useLargeTitleScroll();

  // Card/UPI reference and amounts on screen — keep it out of screenshots and
  // the app-switcher snapshot while this screen is open.
  ScreenCapture.usePreventScreenCapture('pay');

  useEffect(() => {
    if (BUSY_PHASES.includes(phase)) setLastBusy(phase);
  }, [phase]);

  // Once the backend has confirmed the payment, move the dealer to the live
  // order so they never sit on a stale "PENDING" copy.
  useEffect(() => {
    if (phase !== 'verified') return;
    const t = setTimeout(() => router.replace(`/order/${id}`), 1400);
    return () => clearTimeout(t);
  }, [phase, id]);

  const topInset = insets.top + TOP_BAR_HEIGHT;

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingTop: topInset, gap: sectionGap }}>
          <LargeTitleHeader title="Payment" />
          <View style={styles.body}>
            <FormSkeleton groups={2} rows={2} />
          </View>
        </View>
        <ScreenTopBar title="Payment" scrollY={scrollY} />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={[styles.screen, { paddingTop: topInset }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ErrorState error={error} onRetry={refetch} />
        <ScreenTopBar title="Payment" scrollY={scrollY} />
      </View>
    );
  }

  const busy = BUSY_PHASES.includes(phase);
  // A prepaid order is payable in-app only while it's still PENDING (initial
  // payment outstanding). COD, already-confirmed, and cancelled orders have
  // nothing to collect here.
  const nothingToPay =
    order.paymentType === 'COD' || order.amountDue <= 0 || order.status !== 'PENDING';

  if (nothingToPay && phase !== 'verified') {
    // The server is the source of truth: if Razorpay captured the payment (e.g.
    // a UPI collect settled after the sheet was dismissed) the order is already
    // past PENDING, so confirm it here rather than implying nothing happened.
    const paymentReceived =
      order.paymentType !== 'COD' && order.amountPaid > 0 && order.status !== 'PENDING' && order.status !== 'CANCELLED';
    const cancelled = order.status === 'CANCELLED';
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ResultLayout
          icon={
            paymentReceived ? (
              <SuccessCheck />
            ) : (
              <Feather name={cancelled ? 'x-circle' : 'check-circle'} size={48} color={colors.ink3} />
            )
          }
          title={paymentReceived ? 'Payment received' : cancelled ? 'Order cancelled' : 'Nothing left to pay'}
          message={
            paymentReceived
              ? `We received ${formatCurrency(order.amountPaid)} for order #${order.orderNumber}. Your order is confirmed.`
              : cancelled
                ? 'This order was cancelled, so no payment is needed.'
                : 'This order has no pending amount.'
          }
          actions={<Button label="Back to order" variant="primary" fullWidth onPress={() => router.replace(`/order/${order.id}`)} />}
        />
        <ScreenTopBar title="Payment" scrollY={scrollY} />
      </View>
    );
  }

  const cancelledPhase = phase === 'cancelled';
  // A failure before any money moved (create-order error, card declined) is
  // retryable from the chooser. Once Razorpay has reported success
  // (paymentCompleted) nothing may offer another payment — see the hook.
  const retryableFailure = phase === 'failed' && !payment.paidButUnconfirmed && !payment.paymentCompleted;
  const failed = phase === 'failed' && !retryableFailure;
  const showChooser =
    !payment.paymentCompleted && (cancelledPhase || retryableFailure || (phase === 'idle' && showMethods));
  const showProgress = busy || failed || phase === 'verified';
  const advanceAmount = order.grandTotal * 0.2;
  const balanceAmount = order.grandTotal - advanceAmount;

  return (
    <View style={styles.screen}>
      {/* Block the swipe-back gesture mid-verification so the dealer can't
          navigate away while the backend is still confirming the capture. */}
      <Stack.Screen options={{ headerShown: false, gestureEnabled: phase !== 'verifying' }} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: topInset, paddingBottom: insets.bottom + sectionGap }]}
      >
        <LargeTitleHeader title="Payment" />

        <View style={styles.body}>
          {!showChooser && (
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel} maxFontSizeMultiplier={1.2}>
              Amount to pay
            </Text>
            <Text
              accessibilityLabel={`Amount to pay, ${formatCurrency(order.amountDue)}`}
              style={styles.amount}
              maxFontSizeMultiplier={1.2}
            >
              {formatCurrency(order.amountDue)}
            </Text>
            <Text style={styles.caption} maxFontSizeMultiplier={1.2}>
              Order #{order.orderNumber}
            </Text>
            {order.paymentType === 'ADVANCE_20' && (
              <Text style={styles.caption} maxFontSizeMultiplier={1.2}>
                20% advance · balance due on delivery
              </Text>
            )}
          </View>
          )}

          {showChooser && (
            <>
              {cancelledPhase ? (
                <InlineBanner
                  title="Payment cancelled"
                  message={`No money was charged. Order #${order.orderNumber} is saved but unpaid — choose a payment method below to complete it.`}
                />
              ) : retryableFailure ? (
                <InlineBanner
                  title="Payment failed"
                  message={`${payment.error ?? 'Something went wrong with the payment.'} Order #${order.orderNumber} is saved but unpaid.`}
                />
              ) : null}

              <GroupedList header="Choose payment method">
                <PayMethodRow
                  label="Full Payment via Razorpay"
                  hint="Pay 100% now · priority dispatch"
                  amount={formatCurrency(order.grandTotal)}
                  onPress={() => payment.pay(order, 'FULL_100')}
                />
                <PayMethodRow
                  label="20% Advance via Razorpay"
                  hint={`Remaining 80% (${formatCurrency(balanceAmount)}) in cash on delivery · standard dispatch`}
                  amount={formatCurrency(advanceAmount)}
                  onPress={() => payment.pay(order, 'ADVANCE_20')}
                />
              </GroupedList>
            </>
          )}

          {showProgress && (
            <View style={styles.status}>
              {failed && <Feather name="x-circle" size={48} color={colors.red} />}
              <Text
                accessibilityRole="header"
                aria-level={2}
                accessibilityLiveRegion="polite"
                style={styles.statusTitle}
                maxFontSizeMultiplier={1.2}
              >
                {PHASE_COPY[phase]}
              </Text>
              {failed ? (
                <Text style={styles.statusMessage} maxFontSizeMultiplier={1.2}>
                  {payment.error ?? 'Something went wrong with the payment.'}
                </Text>
              ) : phase === 'verified' ? (
                <Text style={styles.statusMessage} maxFontSizeMultiplier={1.2}>
                  {payment.invoiceNumber
                    ? `Invoice ${payment.invoiceNumber} generated. Taking you to your order…`
                    : 'Your order is confirmed. Taking you to your order…'}
                </Text>
              ) : (
                <Text style={styles.statusMessage} maxFontSizeMultiplier={1.2}>
                  {phase === 'verifying'
                    ? 'Confirming your payment with our server. Please don’t close the app.'
                    : 'Complete the payment in the Razorpay window. It uses your installed UPI apps, cards or netbanking.'}
                </Text>
              )}
            </View>
          )}

          {showProgress && <PaymentProgress steps={buildSteps(phase, lastBusy)} />}

          {phase === 'verified' ? (
            <Button label="View order" variant="primary" fullWidth onPress={() => router.replace(`/order/${order.id}`)} />
          ) : busy ? null : (
            <View style={styles.actions}>
              {showChooser ? (
                <>
                  <Button
                    label="Pay later, view order"
                    variant="link"
                    hideChevron
                    fullWidth
                    onPress={() => router.replace(`/order/${order.id}`)}
                  />
                  <Button
                    label="Cancel this order"
                    variant="destructive"
                    fullWidth
                    onPress={() => setCancelSheetOpen(true)}
                  />
                </>
              ) : payment.paidButUnconfirmed ? (
                <>
                  <Button
                    label="Contact support"
                    variant="primary"
                    fullWidth
                    onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/contact`)}
                  />
                  <Button
                    label="View order"
                    variant="link"
                    hideChevron
                    fullWidth
                    onPress={() => router.replace(`/order/${order.id}`)}
                  />
                </>
              ) : (
                <>
                  <Button
                    label={`Pay ${formatCurrency(order.amountDue)}`}
                    variant="primary"
                    fullWidth
                    onPress={() => payment.pay(order)}
                  />
                  <Button
                    label="Choose a different payment method"
                    variant="secondary"
                    fullWidth
                    onPress={() => setShowMethods(true)}
                  />
                  <Button
                    label="Pay later"
                    variant="link"
                    hideChevron
                    fullWidth
                    onPress={() => router.replace(`/order/${order.id}`)}
                  />
                </>
              )}
              <Text style={styles.footnote} maxFontSizeMultiplier={1.2}>
                Payments are secured by Razorpay. Your card / UPI details never reach MotoXPlus.
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      <CancellationSheet
        visible={cancelSheetOpen}
        orderId={order.id}
        onClose={() => setCancelSheetOpen(false)}
        onCancelled={() => {
          setCancelSheetOpen(false);
          router.replace(`/order/${order.id}`);
        }}
      />
      <ScreenTopBar title="Payment" scrollY={scrollY} backDisabled={phase === 'verifying'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { gap: sectionGap },
  body: { paddingHorizontal: screenPaddingX, gap: sectionGap },
  amountCard: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgAlt,
  },
  amountLabel: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  amount: {
    ...font(600),
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  caption: { ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink2 },
  status: { alignItems: 'center', gap: space.sm },
  statusTitle: { ...font(600), fontSize: 21, lineHeight: 25, letterSpacing: -0.42, color: colors.ink, textAlign: 'center' },
  statusMessage: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center' },
  actions: { gap: space.sm },
  footnote: { ...font(400), fontSize: 13, lineHeight: 18, color: colors.ink2, textAlign: 'center' },
});
