import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { orderService } from '../services/orderService';
import type { Order } from '../types';

// GET /orders paginates at a fixed pageSize (10, per docs/api.md §7) and
// there's no aggregate endpoint — dashboard-style totals (outstanding
// balance, in-transit count, the invoices list) are computed client-side by
// paging through the dealer's order history. Capped so a dealer with an
// unusually long history doesn't trigger dozens of parallel requests on
// every Home visit; `truncated` tells the UI when the cap was hit.
const MAX_PAGES = 10;

async function fetchAllOrders(): Promise<{ orders: Order[]; truncated: boolean }> {
  const first = await orderService.list(1);
  const totalPages = Math.ceil(first.total / first.pageSize) || 1;
  const pagesToFetch = Math.min(totalPages, MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pagesToFetch - 1) }, (_, i) => orderService.list(i + 2))
  );
  return {
    orders: [first, ...rest].flatMap((r) => r.orders),
    truncated: totalPages > MAX_PAGES,
  };
}

/** All of the dealer's orders (paginated + merged), for dashboard aggregates and the invoices list. */
export function useAllOrders() {
  return useQuery({
    queryKey: queryKeys.orders.all(),
    queryFn: fetchAllOrders,
    staleTime: 60_000,
  });
}
