import type { DealerStatus } from '@/api/types';
import type { BadgeTone } from '@/components/ui';
import type { BadgeVariant } from '@/src/components/ui';

export const dealerStatusTone: Record<DealerStatus, BadgeTone> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
};

// For the redesigned Badge (src/components/ui), which only has
// neutral/brand/success/info — no warning/danger — mirrors orderStatusVariant's
// approach in constants/orderStatus.ts.
export const dealerStatusVariant: Record<DealerStatus, BadgeVariant> = {
  ACTIVE: 'success',
  PENDING: 'brand',
  SUSPENDED: 'neutral',
  REJECTED: 'neutral',
};
