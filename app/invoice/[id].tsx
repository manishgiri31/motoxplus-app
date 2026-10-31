import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrder } from '@/api/hooks/useOrders';
import type { Order } from '@/api/types';
import { useAuth } from '@/auth/useAuth';
import { company } from '@/config/env';
import { Button, Card, ErrorState, MonoLabel, Skeleton } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
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
          <Skeleton height={28} width="60%" />
          <Skeleton height={120} radius={18} />
          <Skeleton height={200} radius={18} />
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

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Animated.ScrollView entering={FadeIn.duration(280)} contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Tax invoice
          </Text>
          <MonoLabel color="ink" style={styles.number}>{`#${invoice.invoiceNumber}`}</MonoLabel>
          <Text style={styles.meta}>
            Issued {formatDate(invoice.issuedAt ?? order.createdAt)} · Order #{order.orderNumber}
          </Text>
        </View>

        <Card>
          <Text style={styles.label}>From</Text>
          <Text style={styles.strong}>MotoXPlus India Pvt. Ltd.</Text>
          {!!company.address && <Text style={styles.body}>{company.address}</Text>}
          {!!company.phone && <Text style={styles.body}>Phone: {company.phone}</Text>}
          {!!company.gst && <Text style={styles.body}>GST: {company.gst}</Text>}

          <Text style={[styles.label, styles.labelGap]}>Bill to</Text>
          <Text style={styles.strong}>{dealer?.companyName ?? order.deliveryName}</Text>
          {!!dealer?.ownerName && <Text style={styles.body}>{dealer.ownerName}</Text>}
          {!!dealer?.address && <Text style={styles.body}>{dealer.address}</Text>}
          <Text style={styles.body}>
            {[dealer?.city, dealer?.state, dealer?.pincode].filter(Boolean).join(', ')}
          </Text>
          {!!dealer?.gstNumber && <Text style={styles.body}>GST: {dealer.gstNumber}</Text>}
          {!!dealer?.phone && <Text style={styles.body}>Phone: {dealer.phone}</Text>}
          {!!invoice.placeOfSupply && <Text style={styles.body}>Place of supply: {invoice.placeOfSupply}</Text>}
        </Card>

        <Card>
          <Text style={styles.label}>Items</Text>
          {order.items.map((item, i) => (
            <View key={item.id} style={[styles.itemBlock, i !== order.items.length - 1 && styles.divider]}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.strong} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <MonoLabel>{`${item.product.partNumber}${item.product.hsnCode ? ` · HSN ${item.product.hsnCode}` : ''}`}</MonoLabel>
                  <Text style={styles.body}>
                    {item.quantity} × {formatCurrency(item.unitPrice)} · GST {item.gstRate}%
                  </Text>
                </View>
                <Text style={styles.strong}>{formatCurrency(item.total)}</Text>
              </View>
              {item.isSchemeItem && (
                <View style={styles.itemRow}>
                  <Text style={styles.scheme}>Less: Scheme Discount (GST Benefit, Sec. 15(3))</Text>
                  <Text style={styles.scheme}>-{formatCurrency(item.schemeDiscountAmount ?? 0)}</Text>
                </View>
              )}
            </View>
          ))}
        </Card>

        <Card>
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
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand total</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.grandTotal)}</Text>
          </View>
          <Row label="Paid" value={formatCurrency(order.amountPaid)} />
          {order.amountDue > 0 && <Row label="Balance due" value={formatCurrency(order.amountDue)} />}
        </Card>

        <Text style={styles.footnote}>This is a computer-generated invoice and does not require a signature.</Text>

        <Button label="Download PDF" variant="brand" fullWidth loading={exporting} onPress={downloadPdf} />
        <Button
          label="Share as text"
          variant="ghost"
          fullWidth
          onPress={() => Share.share({ message: invoiceShareText(order) })}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: boolean }) {
  return (
    <View style={[styles.row, sub && styles.rowSub]}>
      <Text style={[styles.body, sub && styles.subText]}>{label}</Text>
      <Text style={[styles.rowValue, sub && styles.subText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 16 },
  titleBlock: { gap: 4, paddingTop: 8 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 28, lineHeight: 31, letterSpacing: -0.42, color: colors.ink },
  number: { fontSize: 14 },
  meta: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted },
  label: { fontFamily: fonts.body.semiBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginBottom: 6 },
  labelGap: { marginTop: 20 },
  strong: { fontFamily: fonts.body.semiBold, fontSize: 17, letterSpacing: -0.374, color: colors.ink },
  body: { fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 20, letterSpacing: -0.224, color: colors.muted },
  itemBlock: { paddingVertical: 12, gap: 6 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  itemInfo: { flex: 1, gap: 2 },
  scheme: { flex: 1, fontFamily: fonts.body.regular, fontSize: 12, letterSpacing: -0.12, color: colors.success },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowSub: { paddingLeft: 12 },
  subText: { fontSize: 12, letterSpacing: -0.12 },
  rowValue: { fontFamily: fonts.body.medium, fontSize: 14, letterSpacing: -0.224, color: colors.ink },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  totalLabel: { fontFamily: fonts.display.bold, fontSize: 17, letterSpacing: -0.374, color: colors.ink },
  totalValue: { fontFamily: fonts.display.bold, fontSize: 17, letterSpacing: -0.374, color: colors.ink },
  footnote: { fontFamily: fonts.body.regular, fontSize: 12, letterSpacing: -0.12, color: colors.subtle, textAlign: 'center' },
});
