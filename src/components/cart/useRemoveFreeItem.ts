import { useState } from 'react';

import { getErrorMessage } from '@/api/errors';
import { useApplyScheme } from '@/api/hooks/useSchemes';
import type { CartItem } from '@/api/types';
import { HapticService } from '@/utils/haptics';

/**
 * Removes one GST Benefit free item. POST /cart/scheme is a full replace (the
 * server re-validates the whole selection), so removing a line re-applies the
 * scheme with the remaining items, and clears the scheme when none are left.
 */
export function useRemoveFreeItem(
  schemeId: string | null | undefined,
  schemeItems: CartItem[],
  onNotify: (message: string) => void
) {
  const applyScheme = useApplyScheme();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const remove = (item: CartItem) => {
    HapticService.light();
    const remaining = schemeItems.filter((i) => i.id !== item.id);
    const clearsScheme = !schemeId || remaining.length === 0;
    setRemovingId(item.id);

    applyScheme.mutate(
      clearsScheme
        ? { schemeId: null }
        : {
            schemeId,
            items: remaining.map((i) => ({
              productId: i.productId,
              variantId: i.variantId ?? undefined,
              quantity: i.quantity,
            })),
          },
      {
        onSuccess: () => onNotify(clearsScheme ? 'GST Benefit removed' : 'Free item removed'),
        onError: (err) => onNotify(getErrorMessage(err, 'Could not remove the free item')),
        onSettled: () => setRemovingId(null),
      }
    );
  };

  return { remove, removingId };
}
