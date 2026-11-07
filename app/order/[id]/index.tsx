import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrder } from '@/api/hooks/useOrders';
import type { CancelOrderResponse, Order, OrderItem, OrderStatus, RefundStatus } from '@/api/types';
import { CircleX } from '@/components/icons/CircleX';
import { FileText } from '@/components/icons/FileText';
import { MapPin } from '@/components/icons/MapPin';
import { orderStatusBadgeTone, orderStatusLabel } from '@/constants/orderStatus';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { CancellationSheet } from '@/src/components/cancellation/CancellationSheet';
import { Button, ErrorState, GroupedList, Skeleton, Toast } from '@/src/components/ui';
import { StatusBadge, type StatusTone } from '@/src/components/ui/StatusBadge';
import { Timeline, type TimelineItem } from '@/src/components/ui/Timeline';
import { colors, font, motion, radii, screenPaddingX, sectionGap, space, textStyles } from '@/src/theme';
import { formatCurrency, formatDateTime } from '@/utils/format';

const REFUND_STATUS_TONE: Record<RefundStatus, StatusTone> = {
  INITIATED: 'neutral',
  PROCESSED: 'success',
  FAILED: 'danger',
  NOT_APPLICABLE: 'neutral',
};

// PROCESSING is still pre-shipment (see lib/orders/cancellation.ts on the
// backend) — cancellable at the same 2% pre-ship rate as PENDING/CONFIRMED.
// SHIPPED is deliberately excluded: the backend added a stopgap that hard-
// blocks dealer-initiated cancellation of SHIPPED orders regardless of fee
// (no Delhivery-side shipment cancellation exists yet to back it), so
// offering the button here would always dead-end at the confirmation sheet.
const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING'];

const STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function buildSteps(status: OrderStatus, placedOn: string): TimelineItem[] {
  const currentIndex = STEPS.indexOf(status);
  return STEPS.map((step, i) => ({
    key: step,
    title: orderStatusLabel[step],
    detail: step === 'PENDING' ? `Placed ${placedOn}` : undefined,
    // Delivered is the end of the road: every step is complete, nothing pulses.
    state: status === 'DELIVERED' || i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming',
  }));
}

function StatusTimeline({ order }: { order: Order }) {
  if (order.status === 'CANCELLED' || order.status === 'RETURNED') {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle} maxFontSizeMultiplier={1.2}>
          {order.status === 'CANCELLED' ? 'Order cancelled' : 'Order returned'}
        </Text>
      </View>
    );
  }
  const placedOn = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <View style={styles.panel}>
      <Timeline items={buildSteps(order.status, placedOn)} />
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const reduceMotion = useReduceMotion();
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
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  const showPaymentBanner = order.paymentType !== 'COD' && order.status === 'PENDING' && order.amountDue > 0;
  const showActions = !!order.shipment || !!order.invoice;
  const address = [
    order.deliveryName,
    order.shippingAddress,
    [[order.deliveryCity, order.deliveryState].filter(Boolean).join(', '), order.deliveryPincode]
      .filter(Boolean)
      .join(' '),
    order.deliveryPhone,
  ].filter((line): line is string => !!line);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Animated.ScrollView
        entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.base)}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={styles.orderNumber} maxFontSizeMultiplier={1.2}>
              {`#${order.orderNumber}`}
            </Text>
            <Text style={styles.date} maxFontSizeMultiplier={1.2}>
              {formatDateTime(order.createdAt)}
            </Text>
          </View>
          <StatusBadge label={orderStatusLabel[order.status]} tone={orderStatusBadgeTone[order.status]} />
        </View>

        <StatusTimeline order={order} />

        {/* Only while the initial payment is still outstanding. Once an
            ADVANCE_20 order is CONFIRMED, its remaining balance is collected
            on delivery, not online — see app/order/[id]/pay.tsx. */}
        {showPaymentBanner && (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle} maxFontSizeMultiplier={1.2}>
                Payment due
              </Text>
              <Text style={styles.panelText} maxFontSizeMultiplier={1.2}>
                {`${formatCurrency(order.amountDue)} is due on this order.`}
              </Text>
            </View>
            <Button
              label="Complete payment"
              variant="primary"
              fullWidth
              accessibilityLabel={`Complete payment, ${formatCurrency(order.amountDue)} due`}
              onPress={() => router.push(`/order/${order.id}/pay`)}
            />
          </View>
        )}

        {showActions && (
          <View style={styles.actions}>
            {order.shipment && (
              <Button
                label="Track shipment"
                variant="secondary"
                icon={MapPin}
                style={styles.action}
                onPress={() => router.push(`/order/${order.id}/tracking`)}
              />
            )}
            {order.invoice && (
              <Button
                label="View invoice"
                variant="secondary"
                icon={FileText}
                style={styles.action}
                accessibilityLabel={`View invoice ${order.invoice.invoiceNumber}`}
                onPress={() => router.push(`/invoice/${order.id}`)}
              />
            )}
          </View>
        )}

        {cancellation && cancellation.refundStatus && (
          <GroupedList
            header="Refund"
            footer={
              cancellation.refundStatus === 'FAILED'
                ? "The automatic refund couldn't be processed — our accounts team has been notified and will follow up."
                : null
            }
            footerTone="danger"
          >
            <SummaryRow label="Refund amount" value={formatCurrency(cancellation.refundAmount)} bold />
            <View style={styles.row}>
              <Text style={styles.rowLabel} maxFontSizeMultiplier={1.2}>
                Status
              </Text>
              <StatusBadge
                label={cancellation.refundStatus.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                tone={REFUND_STATUS_TONE[cancellation.refundStatus]}
              />
            </View>
          </GroupedList>
        )}

        <GroupedList header="Items">
          {order.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </GroupedList>

        <GroupedList header="Payment summary">
          <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
          <SummaryRow label="GST" value={formatCurrency(order.gstAmount)} />
          {!!order.schemeBenefitValue && order.schemeBenefitValue > 0 && (
            <SummaryRow
              label="GST Benefit (free items)"
              value={`-${formatCurrency(order.schemeBenefitValue)}`}
              valueColor={colors.success}
            />
          )}
          <SummaryRow label="Shipping" value={order.shippingCost === 0 ? 'Free' : formatCurrency(order.shippingCost)} />
          <SummaryRow label="Total" value={formatCurrency(order.grandTotal)} bold />
          <SummaryRow label="Paid" value={formatCurrency(order.amountPaid)} muted />
          {order.amountDue > 0 && (
            <SummaryRow
              // Once confirmed (COD, or the 80% balance of an advance order) the
              // courier collects what's left in cash on delivery.
              label={order.paymentType === 'COD' || order.status !== 'PENDING' ? 'Pay on Delivery' : 'Amount due'}
              value={formatCurrency(order.amountDue)}
              bold
            />
          )}
        </GroupedList>

        {address.length > 0 && (
          <GroupedList header="Delivery address">
            <View style={styles.addressRow} accessible accessibilityLabel={`Delivery address, ${address.join(', ')}`}>
              {address.map((line, i) => (
                <Text
                  key={i}
                  style={i === 0 ? styles.addressName : styles.addressLine}
                  maxFontSizeMultiplier={1.2}
                >
                  {line}
                </Text>
              ))}
            </View>
          </GroupedList>
        )}

        {order.status === 'SHIPPED' && (
          <View style={styles.notice}>
            <Text style={styles.noticeText} maxFontSizeMultiplier={1.2}>
              This order has shipped, so it can no longer be cancelled from the app.
            </Text>
            <Button label="Contact support" variant="link" onPress={() => router.push('/contact')} />
          </View>
        )}

        {CANCELLABLE_STATUSES.includes(order.status) && (
          <Button
            label="Cancel order"
            variant="destructive"
            icon={CircleX}
            iconColor={colors.red}
            style={styles.cancel}
            onPress={() => setCancelSheetOpen(true)}
          />
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

function ItemRow({ item }: { item: OrderItem }) {
  const free = !!item.isSchemeItem;
  const qtyLine = `${item.quantity} × ${formatCurrency(item.unitPrice)}`;
  return (
    <View
      style={styles.itemRow}
      accessible
      accessibilityLabel={`${item.product.name}, part ${item.product.partNumber}, ${qtyLine}, ${
        free ? 'free' : formatCurrency(item.total)
      }`}
    >
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {item.product.name}
        </Text>
        <Text style={styles.itemMeta} maxFontSizeMultiplier={1.2}>
          {`${item.product.partNumber} · ${qtyLine}`}
        </Text>
      </View>
      {free ? (
        <View style={styles.freeCol}>
          <Text style={styles.freeStruck} maxFontSizeMultiplier={1.2}>
            {formatCurrency(item.total)}
          </Text>
          <StatusBadge label="FREE" tone="success" />
        </View>
      ) : (
        <Text style={styles.itemTotal} maxFontSizeMultiplier={1.2}>
          {formatCurrency(item.total)}
        </Text>
      )}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  muted,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={[styles.rowLabel, bold && styles.rowBold, muted && styles.rowMuted]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <Text
        style={[styles.rowValue, bold && styles.rowBold, muted && styles.rowMuted, !!valueColor && { color: valueColor }]}
        maxFontSizeMultiplier={1.2}
      >
        {value}
      </Text>
    </View>
  );
}

// Same blocks as the real screen, so nothing jumps when the order arrives.
function DetailSkeleton() {
  return (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Skeleton width="55%" height={34} radius={8} />
          <Skeleton width="40%" height={20} radius={6} />
        </View>
        <Skeleton width={72} height={24} radius={radii.pill} />
      </View>
      <Skeleton height={248} radius={radii.card} />
      <Skeleton height={52} radius={radii.pill} />
      <Skeleton height={160} radius={radii.card} />
      <Skeleton height={200} radius={radii.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: screenPaddingX, paddingBottom: sectionGap, gap: sectionGap },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  orderNumber: { ...textStyles.title },
  date: { ...textStyles.callout },
  panel: { gap: space.md, padding: screenPaddingX, borderRadius: radii.card, backgroundColor: colors.bgAlt },
  panelHead: { gap: space.xs },
  panelTitle: { ...textStyles.headline },
  panelText: { ...textStyles.callout },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  action: { flexGrow: 1, flexBasis: 150, paddingHorizontal: space.md },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  rowLabel: { flexShrink: 1, ...textStyles.body },
  rowValue: { ...textStyles.body, fontVariant: ['tabular-nums'] },
  rowBold: { ...font(600) },
  rowMuted: { color: colors.ink2 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  itemInfo: { flex: 1, gap: space.xs },
  itemName: { ...textStyles.body },
  itemMeta: { ...textStyles.callout },
  itemTotal: { ...textStyles.body, ...font(600), fontVariant: ['tabular-nums'] },
  freeCol: { alignItems: 'flex-end', gap: space.xs },
  freeStruck: { ...textStyles.callout, color: colors.ink3, textDecorationLine: 'line-through' },

  addressRow: { gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.md },
  addressName: { ...textStyles.headline },
  addressLine: { ...textStyles.callout },

  notice: { gap: space.xs, alignItems: 'flex-start' },
  noticeText: { ...textStyles.callout },
  cancel: { alignSelf: 'center' },
});
