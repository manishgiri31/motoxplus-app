import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAllOrders } from '@/api/hooks/useAllOrders';
import type { Order, PaymentStatus } from '@/api/types';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { EmptyState, ErrorState, Skeleton } from '@/src/components/ui';
import { StatusBadge, type StatusTone } from '@/src/components/ui/StatusBadge';
import { colors, font, radii, screenPaddingX, space, textStyles } from '@/src/theme';
import { formatCurrency, formatDate } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  PAID: { label: 'Paid', tone: 'success' },
  PARTIAL: { label: 'Partly paid', tone: 'warning' },
  PENDING: { label: 'Unpaid', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  FAILED: { label: 'Payment failed', tone: 'danger' },
};

// Same card as an order in the Orders tab: number and status on top, the
// order and date underneath, the amount last.
const InvoiceRow = memo(function InvoiceRow({ order }: { order: Order }) {
  const focusRing = useFocusRing();
  const invoice = order.invoice!;
  const status = PAYMENT_STATUS[order.paymentStatus];
  const date = formatDate(invoice.issuedAt ?? order.createdAt);

  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        router.push(`/invoice/${order.id}`);
      }}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      accessibilityRole="button"
      accessibilityLabel={`Invoice ${invoice.invoiceNumber}, order ${order.orderNumber}, ${date}, ${formatCurrency(invoice.grandTotal)}, ${status.label}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, focusRing.ringStyle]}
    >
      <View style={styles.topRow}>
        <Text style={styles.invoiceNumber} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {invoice.invoiceNumber}
        </Text>
        <StatusBadge label={status.label} tone={status.tone} />
      </View>
      <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {`Order #${order.orderNumber} · ${date}`}
      </Text>
      <Text style={styles.amount} maxFontSizeMultiplier={1.2}>
        {formatCurrency(invoice.grandTotal)}
      </Text>
    </Pressable>
  );
});

function InvoiceRowSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Skeleton width="45%" height={22} radius={6} />
        <Skeleton width={56} height={24} radius={radii.pill} />
      </View>
      <Skeleton width="60%" height={20} radius={6} />
      <Skeleton width="28%" height={22} radius={6} />
    </View>
  );
}

export default function InvoicesScreen() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAllOrders();

  const invoices = useMemo(
    () =>
      (data?.orders ?? [])
        .filter((o) => o.invoice)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [data]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <InvoiceRowSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InvoiceRow order={item} />}
        contentContainerStyle={invoices.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => {
              HapticService.light();
              refetch();
            }}
            tintColor={colors.ink3}
            colors={[colors.ink3]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title="No invoices yet"
            message="Invoices are generated once an order is confirmed."
            actionLabel="View orders"
            onAction={() => router.push('/(tabs)/orders')}
          />
        }
        ListFooterComponent={
          data?.truncated ? (
            <Text style={styles.footerNote} maxFontSizeMultiplier={1.2}>
              Showing invoices from your most recent orders.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingHorizontal: screenPaddingX, paddingTop: space.xl, paddingBottom: space.xxl, gap: space.md },
  emptyContent: { flexGrow: 1 },
  card: { gap: space.sm, padding: space.lg, borderRadius: radii.card, backgroundColor: colors.bgAlt },
  pressed: { opacity: 0.6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  invoiceNumber: { flexShrink: 1, ...textStyles.headline, fontVariant: ['tabular-nums'] },
  meta: { ...textStyles.callout },
  amount: { ...textStyles.headline, ...font(600), fontVariant: ['tabular-nums'] },
  footerNote: { ...textStyles.caption, color: colors.ink3, textAlign: 'center', paddingVertical: space.lg },
});
