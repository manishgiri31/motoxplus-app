import type { OrderStatus } from '@/api/types';
import type { BadgeTone } from '@/components/ui';
import type { BadgeVariant } from '@/src/components/ui';

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
export const orderStatusVariant: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'brand',
  CONFIRMED: 'brand',
  PROCESSING: 'brand',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  RETURNED: 'neutral',
};
