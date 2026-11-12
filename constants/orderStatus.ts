import type { OrderStatus } from '@/api/types';
import type { StatusTone } from '@/src/components/ui/StatusBadge';

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

// For StatusBadge (12% tint of the status color). The accent is reserved for primary
// buttons and selected states, so in-flight statuses stay neutral grey.
export const orderStatusBadgeTone: Record<OrderStatus, StatusTone> = {
  PENDING: 'warning',
  CONFIRMED: 'neutral',
  PROCESSING: 'neutral',
  SHIPPED: 'neutral',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'danger',
};
