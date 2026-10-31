import { useCallback, useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { colors } from '@/src/theme';

const RING: ViewStyle = { boxShadow: `0 0 0 4px ${colors.focusRing}` };

/**
 * Visible focus ring for keyboard / switch / D-pad focus on iOS and Android.
 * Spread `onFocus`/`onBlur` onto the interactive element and append `ringStyle`
 * to its style.
 *
 * On web this returns no ring on purpose: touch and mouse also fire `onFocus`
 * there, so a state-driven ring would show on every click. Web gets the real
 * `:focus-visible` behaviour from the rule in global.css instead, which only
 * fires for keyboard focus and covers every interactive element at once.
 */
export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  const ringStyle = focused && Platform.OS !== 'web' ? RING : undefined;
  return { onFocus, onBlur, ringStyle };
}
