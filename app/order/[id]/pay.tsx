import { Feather } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrder } from '@/api/hooks/useOrders';
import { webOrigin } from '@/config/env';
import { useRazorpayPayment, type RazorpayPhase } from '@/hooks/useRazorpayPayment';
import { CancellationSheet } from '@/src/components/cancellation/CancellationSheet';
import { Button, Card, ErrorState, MonoLabel } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
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

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const payment = useRazorpayPayment();
  const { phase } = payment;
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);

  // Card/UPI reference and amounts on screen — keep it out of screenshots and
  // the app-switcher snapshot while this screen is open.
  ScreenCapture.usePreventScreenCapture('pay');

  // Once the backend has confirmed the payment, move the dealer to the live
  // order so they never sit on a stale "PENDING" copy.
  useEffect(() => {
    if (phase !== 'verified') return;
    const t = setTimeout(() => router.replace(`/order/${id}`), 1400);
    return () => clearTimeout(t);
  }, [phase, id]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
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
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.content}>
          <Card style={styles.centerCard}>
            <Feather name={cancelled ? 'x-circle' : 'check-circle'} size={40} color={colors.ink} />
            <Text accessibilityRole="header" aria-level={1} style={styles.title}>
              {paymentReceived ? 'Payment received' : cancelled ? 'Order cancelled' : 'Nothing left to pay'}
            </Text>
            <Text style={styles.muted}>
              {paymentReceived
                ? `We received ${formatCurrency(order.amountPaid)} for order #${order.orderNumber}. Your order is confirmed.`
                : cancelled
                  ? 'This order was cancelled, so no payment is needed.'
                  : 'This order has no pending amount.'}
            </Text>
            <Button label="Back to order" variant="brand" fullWidth onPress={() => router.replace(`/order/${order.id}`)} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {/* Block the swipe-back gesture mid-verification so the dealer can't
          navigate away while the backend is still confirming the capture. */}
      <Stack.Screen options={{ gestureEnabled: phase !== 'verifying' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.amountCard}>
          <Text style={styles.muted}>Amount to pay</Text>
          <MonoLabel color="ink" style={styles.amount}>
            {formatCurrency(order.amountDue)}
          </MonoLabel>
          <Text style={styles.orderRef}>Order #{order.orderNumber}</Text>
          {order.paymentType === 'ADVANCE_20' && (
            <Text style={styles.muted}>20% advance · balance due on delivery</Text>
          )}
        </Card>

        {phase === 'verified' ? (
          <Card style={styles.centerCard}>
            <Feather name="check-circle" size={40} color={colors.ink} />
            <Text accessibilityRole="header" aria-level={1} style={styles.title}>Payment successful</Text>
            <Text style={styles.muted}>
              {payment.invoiceNumber
                ? `Invoice ${payment.invoiceNumber} generated. Taking you to your order…`
                : 'Your order is confirmed. Taking you to your order…'}
            </Text>
            <Button label="View order" variant="brand" fullWidth onPress={() => router.replace(`/order/${order.id}`)} />
          </Card>
        ) : busy ? (
          <Card style={styles.centerCard}>
            <ActivityIndicator color={colors.ink} />
            <Text accessibilityRole="header" aria-level={1} style={styles.title}>{PHASE_COPY[phase]}</Text>
            <Text style={styles.muted}>
              {phase === 'verifying'
                ? 'Confirming your payment with our server. Please don’t close the app.'
                : 'Complete the payment in the Razorpay window. It uses your installed UPI apps, cards or netbanking.'}
            </Text>
          </Card>
        ) : (
          <>
            {(phase === 'failed' || phase === 'cancelled') && (
              <Card style={payment.paidButUnconfirmed ? styles.warnCard : styles.infoCard}>
                <Text style={styles.cardHeading}>{PHASE_COPY[phase]}</Text>
                <Text style={styles.muted}>
                  {payment.error ??
                    (phase === 'cancelled'
                      ? `Payment for order #${order.orderNumber} was not completed and no money was taken. Your order is still unpaid — please choose how you’d like to proceed.`
                      : 'Something went wrong with the payment.')}
                </Text>
              </Card>
            )}

            {phase === 'cancelled' ? (
              <>
                <Button
                  label={`Pay ${formatCurrency(order.amountDue)} with Razorpay`}
                  variant="brand"
                  fullWidth
                  onPress={() => payment.pay(order)}
                />
                <Button
                  label="Pay later"
                  variant="ghost"
                  fullWidth
                  onPress={() => router.replace(`/order/${order.id}`)}
                  style={styles.spaced}
                />
                <Button
                  label="Cancel this order"
                  variant="ghost"
                  fullWidth
                  onPress={() => setCancelSheetOpen(true)}
                  style={styles.spaced}
                />
              </>
            ) : payment.paidButUnconfirmed ? (
              <>
                <Button
                  label="Contact support"
                  variant="brand"
                  fullWidth
                  onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/contact`)}
                />
                <Button
                  label="View order"
                  variant="ghost"
                  fullWidth
                  onPress={() => router.replace(`/order/${order.id}`)}
                  style={styles.spaced}
                />
              </>
            ) : (
              <>
                <Button
                  label={phase === 'idle' ? `Pay ${formatCurrency(order.amountDue)}` : 'Try again'}
                  variant="brand"
                  fullWidth
                  onPress={() => payment.pay(order)}
                />
                <Button
                  label="Pay later"
                  variant="ghost"
                  fullWidth
                  onPress={() => router.replace(`/order/${order.id}`)}
                  style={styles.spaced}
                />
              </>
            )}

            <Text style={styles.secured}>Payments are secured by Razorpay. Your card / UPI details never reach MotoXPlus.</Text>
          </>
        )}
      </ScrollView>

      <CancellationSheet
        visible={cancelSheetOpen}
        orderId={order.id}
        onClose={() => setCancelSheetOpen(false)}
        onCancelled={() => {
          setCancelSheetOpen(false);
          router.replace(`/order/${order.id}`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  centerCard: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  amountCard: { alignItems: 'center', gap: 4 },
  amount: { fontSize: 28, letterSpacing: -0.42 },
  orderRef: { fontFamily: fonts.body.regular, fontSize: 12, letterSpacing: -0.12, color: colors.muted },
  title: { fontFamily: fonts.display.bold, fontSize: 17, letterSpacing: -0.374, color: colors.ink, textAlign: 'center' },
  cardHeading: { fontFamily: fonts.display.bold, fontSize: 17, letterSpacing: -0.374, color: colors.ink },
  muted: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  infoCard: { gap: 6 },
  warnCard: { gap: 6, backgroundColor: colors.redSoft, borderColor: colors.redSoft },
  spaced: { marginTop: 4 },
  secured: { fontFamily: fonts.body.regular, fontSize: 12, letterSpacing: -0.12, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
