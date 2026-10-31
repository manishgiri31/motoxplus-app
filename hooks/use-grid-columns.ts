import { useWindowDimensions } from 'react-native';

import { layout } from '@/src/theme';

/**
 * Column count for product / category grids: 2 on phones and tablets, 3 on
 * desktop widths (>= 1068px). Phones stay at 2 rather than 1 — a one-column
 * parts catalog doubles the scrolling for no gain. FlatList can't change
 * `numColumns` in place, so FlatList callers must also key the list on this
 * value (FlashList handles the change itself).
 */
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  return width >= layout.breakpoints.desktop ? 3 : 2;
}
