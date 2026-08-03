import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAllOrders } from '@/api/hooks/useAllOrders';
import type { Order, PaymentStatus } from '@/api/types';
import { Badge, Card, EmptyState, ErrorState, MonoLabel, SkeletonListRow } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { formatCurrency } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

const paymentStatusVariant: Record<PaymentStatus, { label: string; variant: 'success' | 'brand' | 'neutral' }> = {
  PAID: { label: 'Paid', variant: 'success' },
  PARTIAL: { label: 'Partial', variant: 'brand' },
  PENDING: { label: 'Unpaid', variant: 'neutral' },
};

const InvoiceRow = memo(function InvoiceRow({ order }: { order: Order }) {
  const invoice = order.invoice!;
  const status = paymentStatusVariant[order.paymentStatus];

  return (
    <Card onPress={() => router.push(`/order/${order.id}`)} accessibilityLabel={`Invoice ${invoice.invoiceNumber}`} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <MonoLabel color="ink" style={styles.invoiceNumber}>{`#${invoice.invoiceNumber}`}</MonoLabel>
          <Text style={styles.orderLine}>
            Order #{order.orderNumber} ·{' '}
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatCurrency(invoice.grandTotal)}</Text>
          <Badge label={status.label} variant={status.variant} />
        </View>
      </View>
    </Card>
  );
});

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
        <View style={styles.header}>
          <Text style={styles.title}>Invoices</Text>
        </View>
        <View style={styles.listContent}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonListRow key={i} />
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
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
      </View>

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
            tintColor={colors.red}
            colors={[colors.red]}
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
          data?.truncated ? <Text style={styles.footerNote}>Showing invoices from your most recent orders.</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 24, color: colors.ink },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  emptyContent: { flexGrow: 1 },
  card: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1, gap: 4 },
  invoiceNumber: { fontSize: 14 },
  orderLine: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink, textAlign: 'right' },
  footerNote: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, textAlign: 'center', paddingVertical: 16, paddingHorizontal: 16 },
});
