import { Feather } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCancellationPreview, useCancelOrder } from '@/api/hooks/useCancellation';
import { getErrorMessage } from '@/api/errors';
import type { CancelOrderResponse, CancelReasonCode } from '@/api/types';
import { webOrigin } from '@/config/env';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { Button, GroupedList, Sheet, Skeleton } from '@/src/components/ui';
import { colors, font, radii, space, textStyles } from '@/src/theme';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

const REASONS: { label: string; code: CancelReasonCode }[] = [
  { label: 'Changed my mind', code: 'CHANGED_MIND' },
  { label: 'Ordered by mistake', code: 'ORDERED_BY_MISTAKE' },
  { label: 'Found a better price', code: 'FOUND_BETTER_PRICE' },
  { label: 'Delivery taking too long', code: 'DELIVERY_TOO_SLOW' },
  { label: 'Other', code: 'OTHER' },
];

export interface CancellationSheetProps {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onCancelled: (result: CancelOrderResponse) => void;
}

// Fetches the real cancellation-preview endpoint and posts the real cancel
// endpoint — see api/services/cancellationService.ts. Every number shown
// here comes from that response; nothing is recomputed client-side.
export function CancellationSheet({ visible, orderId, onClose, onCancelled }: CancellationSheetProps) {
  const preview = useCancellationPreview(orderId, visible);
  const cancelOrder = useCancelOrder(orderId);
  const [reasonCode, setReasonCode] = useState<CancelReasonCode | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  const data = preview.data;
  const allowed = data?.allowed === true;

  const handleCancel = () => {
    if (!allowed || !data) return;
    HapticService.medium();
    cancelOrder.mutate(
      { reasonCode: reasonCode ?? undefined, expectedStage: data.stage },
      {
        onSuccess: (result) => onCancelled(result),
        onError: (err) => {
          // The order's dispatch stage changed between preview and confirm —
          // refetch so the sheet shows current numbers and requires a fresh
          // tap rather than reusing stale ones.
          if (isAxiosError(err) && err.response?.status === 409) {
            setStaleNotice('Order status changed — charge updated. Please review and confirm again.');
            preview.refetch();
          } else {
            setStaleNotice(null);
          }
        },
      }
    );
  };

  const openSupport = () => WebBrowser.openBrowserAsync(`${webOrigin}/contact`);
  const errorText = staleNotice ?? (cancelOrder.isError ? getErrorMessage(cancelOrder.error, 'Could not cancel this order') : null);

  const footer =
    data && allowed ? (
      <View style={styles.footer}>
        {!!errorText && (
          <Text style={styles.errorText} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
            {errorText}
          </Text>
        )}
        <Button
          label="Confirm cancellation"
          variant="destructive"
          fullWidth
          loading={cancelOrder.isPending}
          onPress={handleCancel}
        />
      </View>
    ) : undefined;

  return (
    <Sheet visible={visible} onClose={onClose} title="Cancel order" detents={[0.6, 0.9]} scrollable footer={footer}>
      {preview.isLoading && (
        <View style={styles.skeletons}>
          <Skeleton height={5 * 52} radius={radii.card} />
          <Skeleton height={3 * 52} radius={radii.card} />
        </View>
      )}

      {preview.isError && (
        <Blocked
          message={getErrorMessage(preview.error, "Cancellation isn't available for this order right now.")}
          onContact={openSupport}
        />
      )}

      {data && !allowed && <Blocked message={data.reason} onContact={openSupport} />}

      {data && allowed && (
        <>
          <GroupedList header="Reason (optional)">
            {REASONS.map((r) => (
              <ReasonRow
                key={r.code}
                label={r.label}
                selected={reasonCode === r.code}
                onPress={() => setReasonCode(r.code)}
              />
            ))}
          </GroupedList>

          <GroupedList header="Fee preview">
            <FeeRow label="Order total" value={formatCurrency(data.grandTotal)} />
            <FeeRow label="Amount paid" value={formatCurrency(data.amountPaid)} />
            <FeeRow
              label={`Cancellation charge (${data.chargePercent}%)`}
              value={data.waived ? 'Waived' : formatCurrency(data.chargeAmount)}
              danger={!data.waived && data.chargeAmount > 0}
            />
          </GroupedList>

          <GroupedList
            header="Refund"
            footer={
              data.refundAmount > 0
                ? `A refund of ${formatCurrency(data.refundAmount)} is initiated as soon as you confirm.`
                : data.amountPaid === 0
                  ? 'No payment has been collected on this order, so there is nothing to refund.'
                  : null
            }
          >
            <FeeRow label="Refund amount" value={formatCurrency(data.refundAmount)} bold />
          </GroupedList>
        </>
      )}
    </Sheet>
  );
}

function Blocked({ message, onContact }: { message: string; onContact: () => void }) {
  return (
    <View style={styles.blocked}>
      <Text style={styles.blockedText} maxFontSizeMultiplier={1.2}>
        {message}
      </Text>
      <Button label="Contact support" variant="secondary" onPress={onContact} />
    </View>
  );
}

// Radio row: the selected one gets the accent tick.
function ReasonRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const focusRing = useFocusRing();
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, focusRing.ringStyle]}
    >
      <Text style={[styles.rowLabel, selected && styles.rowBold]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      {selected && <Feather name="check" size={20} color={colors.accent} />}
    </Pressable>
  );
}

function FeeRow({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={[styles.rowLabel, bold && styles.rowBold]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <Text
        style={[styles.rowValue, bold && styles.rowBold, danger && { color: colors.red }]}
        maxFontSizeMultiplier={1.2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletons: { gap: space.xxl },
  blocked: { gap: space.lg, alignItems: 'flex-start' },
  blockedText: { ...textStyles.callout },
  footer: { gap: space.md },
  errorText: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.red },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  pressed: { opacity: 0.6 },
  rowLabel: { flexShrink: 1, ...textStyles.body },
  rowValue: { ...textStyles.body, fontVariant: ['tabular-nums'] },
  rowBold: { ...font(600) },
});
