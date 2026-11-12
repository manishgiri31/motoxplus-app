import type { DealerStatus } from '@/api/types';
import type { StatusTone } from '@/src/components/ui/StatusBadge';

export const dealerStatusLabel: Record<DealerStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  REJECTED: 'Rejected',
};

// For StatusBadge (12% tint of the status color).
export const dealerStatusBadgeTone: Record<DealerStatus, StatusTone> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
};
