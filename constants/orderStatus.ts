import type { OrderStatus } from '@/api/types';
import type { BadgeTone } from '@/components/ui';
import type { BadgeVariant } from '@/src/components/ui';
import type { StatusTone } from '@/src/components/ui/StatusBadge';

export const orderStatusTone: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'brand',
  PROCESSING: 'brand',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'danger',
};

// For the redesigned Badge (src/components/ui), which only has
// neutral/brand/success/info — no warning/danger — so this is a distinct
// mapping from orderStatusTone above, not a like-for-like swap.
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

export const orderStatusVariant: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'brand',
  CONFIRMED: 'brand',
  PROCESSING: 'brand',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  RETURNED: 'neutral',
};
