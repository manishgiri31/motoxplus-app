import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useOrder } from '@/api/hooks/useOrders';
import type { CancelOrderResponse, OrderStatus } from '@/api/types';
import { Badge as LegacyBadge } from '@/components/ui';
import { webOrigin } from '@/config/env';
import { orderStatusVariant } from '@/constants/orderStatus';
import { CancellationSheet } from '@/src/components/cancellation/CancellationSheet';
import { Badge, Button, Card, ErrorState, MonoLabel, Toast } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { formatCurrency } from '@/utils/format';

const REFUND_STATUS_TONE: Record<'INITIATED' | 'PROCESSED' | 'FAILED' | 'NOT_APPLICABLE', 'brand' | 'success' | 'danger'> = {
  INITIATED: 'brand',
  PROCESSED: 'success',
  FAILED: 'danger',
  NOT_APPLICABLE: 'brand',
};

// PROCESSING is still pre-shipment (see lib/orders/cancellation.ts on the
// backend) — cancellable at the same 2% pre-ship rate as PENDING/CONFIRMED.
// SHIPPED is deliberately excluded: the backend added a stopgap that hard-
// blocks dealer-initiated cancellation of SHIPPED orders regardless of fee
// (no Delhivery-side shipment cancellation exists yet to back it), so
// offering the button here would always dead-end at the confirmation sheet.
const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING'];

const STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return <Badge label="Order cancelled" variant="neutral" />;
  }
  if (status === 'RETURNED') {
    return <Badge label="Order returned" variant="neutral" />;
  }
  const currentIndex = STEPS.indexOf(status);
  return (
    <View style={styles.timeline}>
      {STEPS.map((step, i) => (
        <View key={step} style={styles.timelineStep}>
          <View style={[styles.dot, i <= currentIndex && styles.dotComplete]} />
          {i < STEPS.length - 1 && <View style={[styles.timelineLine, i < currentIndex && styles.timelineLineComplete]} />}
        </View>
      ))}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [cancelledMessage, setCancelledMessage] = useState<string | null>(null);
  const [cancellation, setCancellation] = useState<CancelOrderResponse | null>(null);

  const handleCancelled = (result: CancelOrderResponse) => {
    setCancelSheetOpen(false);
    setCancellation(result);
    setCancelledMessage(
      result.refundAmount > 0
        ? `Order cancelled — ${formatCurrency(result.refundAmount)} refund initiated`
        : 'Order cancelled'
    );
    refetch();
  };

  if (isLoading || !order) {
    if (isError) {
      return (
        <SafeAreaView style={styles.screen} edges={['bottom']}>
          <ErrorState error={error} onRetry={refetch} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Animated.ScrollView entering={FadeIn.duration(200)} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <MonoLabel color="ink" style={styles.orderNumber}>{`#${order.orderNumber}`}</MonoLabel>
            <Text style={styles.date}>{new Date(order.createdAt).toLocaleString('en-IN')}</Text>
          </View>
          <Badge label={order.status} variant={orderStatusVariant[order.status]} />
        </View>

        <StatusTimeline status={order.status} />

        {order.paymentType !== 'COD' && order.amountDue > 0 && order.status !== 'CANCELLED' && (
          <Button
            label={`Complete payment — ${formatCurrency(order.amountDue)}`}
            variant="brand"
            onPress={() => router.push(`/order/${order.id}/pay-upi`)}
          />
        )}

        {order.shipment && (
          <Button label="Track shipment" variant="ghost" onPress={() => router.push(`/order/${order.id}/tracking`)} />
        )}

        {cancellation && cancellation.refundStatus && (
          <Card style={styles.refundCard}>
            <Text style={styles.sectionTitle}>Refund</Text>
            <View style={styles.refundTrackerRow}>
              <MonoLabel color="ink">{formatCurrency(cancellation.refundAmount)}</MonoLabel>
              <LegacyBadge
                label={cancellation.refundStatus.replace('_', ' ')}
                tone={REFUND_STATUS_TONE[cancellation.refundStatus]}
              />
            </View>
            {cancellation.refundStatus === 'FAILED' && (
              <Text style={styles.invoiceNote}>
                The automatic refund couldn&apos;t be processed — our accounts team has been notified and will follow
                up.
              </Text>
            )}
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item, i) => (
            <View key={item.id} style={[styles.itemRow, i !== order.items.length - 1 && styles.itemRowDivider]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <MonoLabel>{item.product.partNumber}</MonoLabel>
                <Text style={styles.itemQty}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Payment summary</Text>
          <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
          <SummaryRow label="GST" value={formatCurrency(order.gstAmount)} />
          <SummaryRow label="Shipping" value={order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.grandTotal)}</Text>
          </View>
          <SummaryRow label="Paid" value={formatCurrency(order.amountPaid)} muted />
          {order.amountDue > 0 && <SummaryRow label="Amount due" value={formatCurrency(order.amountDue)} accent />}
        </Card>

        {order.invoice && (
          <Card style={styles.invoiceCard}>
            <Text style={styles.sectionTitle}>{`Invoice #${order.invoice.invoiceNumber}`}</Text>
            <Text style={styles.invoiceNote}>
              A downloadable PDF isn&apos;t available in the app yet — you can share these details for now.
            </Text>
            <Button
              label="Share invoice details"
              variant="ghost"
              onPress={() =>
                Share.share({
                  message: `Invoice ${order.invoice!.invoiceNumber} for order #${order.orderNumber}\nTotal: ${formatCurrency(order.invoice!.grandTotal)}`,
                })
              }
            />
          </Card>
        )}

        {order.shippingAddress && (
          <Card>
            <Text style={styles.sectionTitle}>Delivery address</Text>
            <Text style={styles.address}>{order.deliveryName}</Text>
            <Text style={styles.address}>{order.shippingAddress}</Text>
            <Text style={styles.address}>
              {order.deliveryCity}, {order.deliveryState} {order.deliveryPincode}
            </Text>
            <Text style={styles.address}>{order.deliveryPhone}</Text>
          </Card>
        )}

        {CANCELLABLE_STATUSES.includes(order.status) && (
          <Button label="Cancel order" variant="ghost" onPress={() => setCancelSheetOpen(true)} />
        )}

        {order.status === 'SHIPPED' && (
          <View style={styles.shippedNotice}>
            <Text style={styles.shippedNoticeText}>
              This order has shipped, so it can no longer be cancelled from the app.
            </Text>
            <Button
              label="Contact support"
              variant="ghost"
              onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/contact`)}
            />
          </View>
        )}
      </Animated.ScrollView>

      <CancellationSheet
        visible={cancelSheetOpen}
        orderId={order.id}
        onClose={() => setCancelSheetOpen(false)}
        onCancelled={handleCancelled}
      />

      {cancelledMessage && <Toast message={cancelledMessage} onHide={() => setCancelledMessage(null)} />}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, accent && styles.summaryAccent]}>{label}</Text>
      <Text style={[styles.summaryValue, muted && styles.summaryMuted, accent && styles.summaryAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderNumber: { fontSize: 15, marginBottom: 4 },
  date: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  timeline: { flexDirection: 'row', alignItems: 'center' },
  timelineStep: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.line },
  dotComplete: { backgroundColor: colors.red },
  timelineLine: { flex: 1, height: 2, backgroundColor: colors.line },
  timelineLineComplete: { backgroundColor: colors.red },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, gap: 12 },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  itemQty: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  itemTotal: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  summaryValue: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.ink },
  summaryMuted: { color: colors.muted },
  summaryAccent: { color: colors.red, fontFamily: fonts.body.semiBold },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  totalLabel: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  refundCard: { gap: 8 },
  refundTrackerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoiceCard: { gap: 8 },
  invoiceNote: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  address: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  shippedNotice: { gap: 8, alignItems: 'flex-start' },
  shippedNoticeText: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted },
});
