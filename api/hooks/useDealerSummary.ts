import { useMemo } from 'react';

import { isFewLeft } from '@/utils/stock';

import type { Order, Product } from '../types';
import { useAllOrders } from './useAllOrders';

const RECENT_ORDERS_LIMIT = 5;

function dedupeProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  const result: Product[] = [];
  for (const product of products) {
    if (!seen.has(product.id)) {
      seen.add(product.id);
      result.push(product);
    }
  }
  return result;
}

/** Dealer Command Center dashboard data, derived entirely from the dealer's order history — there's no dedicated aggregate endpoint (see useAllOrders). */
export function useDealerSummary() {
  const query = useAllOrders();

  const summary = useMemo(() => {
    const orders = query.data?.orders ?? [];
    const active = orders.filter((o) => o.status !== 'CANCELLED');

    const outstandingBalance = active.reduce((sum, o) => sum + o.amountDue, 0);
    const ordersInTransit = active.filter((o) => o.status === 'SHIPPED').length;
    // Paid and being prepared: the orders the Orders list labels Confirmed or
    // Processing. (Unpaid PENDING orders are counted under pending payments,
    // not here, so no order is counted twice.)
    const processingOrders = active.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length;
    // Orders still waiting for the dealer to pay online. A confirmed advance
    // order's remaining 80% is collected on delivery, so it isn't one of these.
    const awaitingPayment = [...active]
      .filter((o) => o.status === 'PENDING' && o.amountDue > 0)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const pendingPaymentOrders = awaitingPayment.length;

    const recentOrders = [...orders]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, RECENT_ORDERS_LIMIT);

    const trackable: Order | undefined =
      recentOrders.find((o) => o.shipment && o.status === 'SHIPPED') ??
      recentOrders.find((o) => o.shipment) ??
      orders.find((o) => o.shipment);

    const recentlyOrderedProducts = dedupeProducts(
      recentOrders.flatMap((o) => o.items.map((item) => item.product))
    ).slice(0, 10);

    const lowStockProducts = recentlyOrderedProducts
      .filter(isFewLeft)
      .slice(0, 6);

    const invoiceCount = orders.filter((o) => o.invoice).length;

    return {
      outstandingBalance,
      ordersInTransit,
      processingOrders,
      pendingPaymentOrders,
      /** The newest order awaiting payment, for jumping straight to it. */
      paymentDueOrderId: awaitingPayment[0]?.id ?? null,
      recentOrders,
      recentlyOrderedProducts,
      lowStockProducts,
      trackableOrderId: trackable?.id ?? null,
      invoiceCount,
    };
  }, [query.data]);

  return { ...query, summary, truncated: query.data?.truncated ?? false };
}
