import { Feather } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCancellationPreview, useCancelOrder } from '@/api/hooks/useCancellation';
import { getErrorMessage } from '@/api/errors';
import { webOrigin } from '@/config/env';
import { Button, MonoLabel } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

const REASONS = ['Ordered by mistake', 'Found a better price', 'Delivery taking too long', 'Other'];

export interface CancellationSheetProps {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onCancelled: () => void;
}

// Fetches a real (currently unimplemented) cancellation-preview endpoint and
// posts a real (currently unimplemented) cancel endpoint — see
// api/services/cancellationService.ts. Every number shown here comes from
// that response; nothing is recomputed client-side.
export function CancellationSheet({ visible, orderId, onClose, onCancelled }: CancellationSheetProps) {
  const insets = useSafeAreaInsets();
  const preview = useCancellationPreview(orderId, visible);
  const cancelOrder = useCancelOrder(orderId);
  const [reason, setReason] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);

  const handleCancel = () => {
    if (!preview.data) return;
    HapticService.medium();
    cancelOrder.mutate(
      { reason: reason ?? undefined },
      {
        onSuccess: () => onCancelled(),
        onError: (err) => {
          // A real backend would 409 here if the order's dispatch stage
          // changed between preview and confirm — refetch so the sheet shows
          // current numbers and require a fresh tap rather than reusing stale ones.
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Cancel order</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={20} color={colors.ink} />
            </Pressable>
          </View>

          {preview.isLoading && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.ink} />
            </View>
          )}

          {preview.isError && (
            <View style={styles.blocked}>
              <Text style={styles.blockedText}>
                {getErrorMessage(preview.error, "Cancellation isn't available for this order right now.")}
              </Text>
              <Button label="Contact support" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/contact`)} />
            </View>
          )}

          {preview.data && (
            <>
              <View style={styles.breakdown}>
                <BreakdownRow label="Order total" value={formatCurrency(preview.data.orderTotal)} />
                <BreakdownRow label="Amount paid" value={formatCurrency(preview.data.amountPaid)} />
                <BreakdownRow
                  label={`Cancellation charge (${preview.data.chargePercent}%)`}
                  value={formatCurrency(preview.data.cancellationCharge)}
                  accent
                />
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Refund amount</Text>
                  <Text style={styles.refundValue}>{formatCurrency(preview.data.refundAmount)}</Text>
                </View>
              </View>

              {staleNotice && <Text style={styles.staleNotice}>{staleNotice}</Text>}

              <Text style={styles.reasonTitle}>Reason (optional)</Text>
              <View style={styles.reasonList}>
                {REASONS.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: reason === r }}
                  >
                    <Text style={[styles.reasonLabel, reason === r && styles.reasonLabelActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>

              {cancelOrder.isError && !staleNotice && (
                <Text style={styles.errorText}>{getErrorMessage(cancelOrder.error, 'Could not cancel this order')}</Text>
              )}

              <Button
                label={`Cancel & accept ${formatCurrency(preview.data.cancellationCharge)} charge`}
                variant="brand"
                fullWidth
                loading={cancelOrder.isPending}
                onPress={handleCancel}
                style={styles.confirmButton}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function BreakdownRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <MonoLabel color={accent ? 'red' : 'ink'}>{value}</MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,24,26,0.4)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '85%',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, marginVertical: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink },
  loading: { paddingVertical: 32, alignItems: 'center' },
  blocked: { paddingVertical: 16, gap: 12 },
  blockedText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  breakdown: { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted, flexShrink: 1, paddingRight: 12 },
  refundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  refundLabel: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.ink },
  refundValue: { fontFamily: fonts.display.bold, fontSize: 17, color: colors.ink },
  staleNotice: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.red, marginTop: 8 },
  reasonTitle: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.ink, marginTop: 16, marginBottom: 8 },
  reasonList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8 },
  reasonChipActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  reasonLabel: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.ink },
  reasonLabelActive: { color: colors.red },
  errorText: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.red, marginTop: 12 },
  confirmButton: { marginTop: 16 },
});
