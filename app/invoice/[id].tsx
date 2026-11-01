import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrder } from '@/api/hooks/useOrders';
import type { Order } from '@/api/types';
import { useAuth } from '@/auth/useAuth';
import { company } from '@/config/env';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { Button, ErrorState, Skeleton } from '@/src/components/ui';
import { colors, font, motion, radii, screenPaddingX, space, textStyles } from '@/src/theme';
import { formatCurrency } from '@/utils/format';
import { shareInvoicePdf } from '@/utils/invoicePdf';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function invoiceShareText(order: Order): string {
  const invoice = order.invoice!;
  const lines = [
    `Tax invoice ${invoice.invoiceNumber}`,
    `Order #${order.orderNumber} · ${formatDate(invoice.issuedAt ?? order.createdAt)}`,
    '',
    ...order.items.map(
      (item) =>
        `${item.product.name} (${item.product.partNumber}) × ${item.quantity}  ${
          item.isSchemeItem ? 'FREE (GST Benefit)' : formatCurrency(item.total)
        }`
    ),
    '',
    `Subtotal (excl. GST): ${formatCurrency(invoice.subtotal)}`,
    `GST: ${formatCurrency(invoice.gstAmount)}`,
    `Grand total: ${formatCurrency(invoice.grandTotal)}`,
  ];
  return lines.join('\n');
}

// The dealer's GST tax invoice for an order: seller and bill-to blocks, item
// table (with the GST Benefit "scheme discount" line for free items), the
// CGST/SGST or IGST breakup, and what has been paid. Built from the order the
// backend already returns; there's no separate invoice endpoint.
export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dealer } = useAuth();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const [exporting, setExporting] = useState(false);

  const downloadPdf = async () => {
    if (!order) return;
    setExporting(true);
    try {
      await shareInvoicePdf(order, dealer);
    } catch (err) {
      Alert.alert("Couldn't create the PDF", err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.paper}>
            <Skeleton width="30%" height={16} radius={6} />
            <Skeleton width="55%" height={34} radius={8} />
            <Skeleton width="70%" height={20} radius={6} />
            <Skeleton height={120} radius={radii.sm} />
            <Skeleton height={160} radius={radii.sm} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const invoice = order.invoice;
  if (!invoice) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState message="This order doesn't have an invoice yet. It is issued once the order is confirmed." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const igst = invoice.igstAmount ?? 0;
  const hasSplit = igst > 0 || (invoice.cgstAmount ?? 0) > 0 || (invoice.sgstAmount ?? 0) > 0;
  const billToLocation = [dealer?.city, dealer?.state, dealer?.pincode].filter(Boolean).join(', ');

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        entering={reduceMotion ? undefined : FadeIn.duration(motion.duration.base)}
        contentContainerStyle={styles.content}
      >
        <View style={styles.paper}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
              Tax invoice
            </Text>
            <Text accessibilityRole="header" aria-level={1} style={styles.number} maxFontSizeMultiplier={1.2}>
              {`#${invoice.invoiceNumber}`}
            </Text>
            <Text style={styles.meta} maxFontSizeMultiplier={1.2}>
              {`Issued ${formatDate(invoice.issuedAt ?? order.createdAt)} · Order #${order.orderNumber}`}
            </Text>
          </View>

          <View style={styles.rule} />

          <View style={styles.party}>
            <Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
              From
            </Text>
            <Text style={styles.partyName} maxFontSizeMultiplier={1.2}>
              MotoXPlus India Pvt. Ltd.
            </Text>
            {!!company.address && <Line>{company.address}</Line>}
            {!!company.phone && <Line>{`Phone: ${company.phone}`}</Line>}
            {!!company.gst && <Line>{`GST: ${company.gst}`}</Line>}
          </View>

          <View style={styles.party}>
            <Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
              Bill to
            </Text>
            <Text style={styles.partyName} maxFontSizeMultiplier={1.2}>
              {dealer?.companyName ?? order.deliveryName}
            </Text>
            {!!dealer?.ownerName && <Line>{dealer.ownerName}</Line>}
            {!!dealer?.address && <Line>{dealer.address}</Line>}
            {!!billToLocation && <Line>{billToLocation}</Line>}
            {!!dealer?.gstNumber && <Line>{`GST: ${dealer.gstNumber}`}</Line>}
            {!!dealer?.phone && <Line>{`Phone: ${dealer.phone}`}</Line>}
            {!!invoice.placeOfSupply && <Line>{`Place of supply: ${invoice.placeOfSupply}`}</Line>}
          </View>

          <View style={styles.rule} />

          <View>
            <View style={styles.tableHead}>
              <Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
                Item
              </Text>
              <Text style={styles.eyebrow} maxFontSizeMultiplier={1.2}>
                Amount
              </Text>
            </View>
            {order.items.map((item, i) => (
              <View key={item.id} style={[styles.itemBlock, i > 0 && styles.itemDivider]}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.partyName} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.caption} maxFontSizeMultiplier={1.2}>
                      {`${item.product.partNumber}${item.product.hsnCode ? ` · HSN ${item.product.hsnCode}` : ''}`}
                    </Text>
                    <Line>{`${item.quantity} × ${formatCurrency(item.unitPrice)} · GST ${item.gstRate}%`}</Line>
                  </View>
                  <Text style={styles.amount} maxFontSizeMultiplier={1.2}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
                {item.isSchemeItem && (
                  <View style={styles.itemRow}>
                    <Text style={styles.scheme} maxFontSizeMultiplier={1.2}>
                      Less: Scheme Discount (GST Benefit, Sec. 15(3))
                    </Text>
                    <Text style={styles.schemeAmount} maxFontSizeMultiplier={1.2}>
                      {`-${formatCurrency(item.schemeDiscountAmount ?? 0)}`}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.rule} />

          <View style={styles.totals}>
            <Row label="Subtotal (excl. GST)" value={formatCurrency(invoice.subtotal)} />
            <Row label="GST" value={formatCurrency(invoice.gstAmount)} />
            {hasSplit &&
              (igst > 0 ? (
                <Row label="IGST" value={formatCurrency(igst)} sub />
              ) : (
                <>
                  <Row label="CGST" value={formatCurrency(invoice.cgstAmount ?? 0)} sub />
                  <Row label="SGST" value={formatCurrency(invoice.sgstAmount ?? 0)} sub />
                </>
              ))}
            <View style={styles.grandRow}>
              <Text style={styles.grandText} maxFontSizeMultiplier={1.2}>
                Grand total
              </Text>
              <Text style={[styles.grandText, styles.tabular]} maxFontSizeMultiplier={1.2}>
                {formatCurrency(invoice.grandTotal)}
              </Text>
            </View>
            <Row label="Paid" value={formatCurrency(order.amountPaid)} />
            {order.amountDue > 0 && <Row label="Balance due" value={formatCurrency(order.amountDue)} strong />}
          </View>

          <Text style={styles.footnote} maxFontSizeMultiplier={1.2}>
            This is a computer-generated invoice and does not require a signature.
          </Text>
        </View>
      </Animated.ScrollView>

      {/* Both actions hand off to the system share sheet: the PDF via expo-sharing, the text via Share. */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          label="Download PDF"
          variant="primary"
          loading={exporting}
          style={styles.barButton}
          onPress={downloadPdf}
        />
        <Button
          label="Share as text"
          variant="secondary"
          style={styles.barButton}
          onPress={() => Share.share({ message: invoiceShareText(order) })}
        />
      </View>
    </View>
  );
}

function Line({ children }: { children: string }) {
  return (
    <Text style={styles.line} maxFontSizeMultiplier={1.2}>
      {children}
    </Text>
  );
}

function Row({ label, value, sub, strong }: { label: string; value: string; sub?: boolean; strong?: boolean }) {
  return (
    <View style={[styles.row, sub && styles.rowSub]} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={[styles.line, sub && styles.caption, strong && styles.strong]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <Text style={[styles.rowValue, sub && styles.caption, strong && styles.strong]} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgAlt },
  content: { padding: screenPaddingX, paddingBottom: space.x3 },

  // White sheet of paper on the grey screen: a whisper of shadow, no border.
  paper: {
    gap: space.xxl,
    padding: screenPaddingX,
    borderRadius: radii.card,
    backgroundColor: colors.white,
    boxShadow: `0 1px 3px ${colors.lineSoft}`,
  },
  titleBlock: { gap: space.xs },
  eyebrow: {
    ...font(600),
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  number: { ...textStyles.title },
  meta: { ...textStyles.callout },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },

  party: { gap: space.xs },
  partyName: { ...textStyles.calloutStrong },
  line: { ...textStyles.callout },
  caption: { ...textStyles.caption },

  tableHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space.xs },
  itemBlock: { paddingVertical: space.md, gap: space.sm },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.lineSoft },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md },
  itemInfo: { flex: 1, gap: space.xs },
  amount: { ...textStyles.calloutStrong, fontVariant: ['tabular-nums'] },
  scheme: { flex: 1, ...textStyles.caption, color: colors.success },
  schemeAmount: { ...textStyles.caption, color: colors.success, fontVariant: ['tabular-nums'] },

  totals: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  rowSub: { paddingLeft: space.md },
  rowValue: { ...textStyles.callout, color: colors.ink, fontVariant: ['tabular-nums'] },
  strong: { ...font(600), color: colors.ink },
  tabular: { fontVariant: ['tabular-nums'] },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    marginVertical: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  grandText: { ...textStyles.headline },
  footnote: { ...textStyles.caption, color: colors.ink3, textAlign: 'center' },

  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingTop: space.md,
    paddingHorizontal: screenPaddingX,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  barButton: { flexGrow: 1, flexBasis: 150, paddingHorizontal: space.md },
});
