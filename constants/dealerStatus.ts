import type { DealerStatus } from '@/api/types';
import type { BadgeTone } from '@/components/ui';

export const dealerStatusTone: Record<DealerStatus, BadgeTone> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
};
