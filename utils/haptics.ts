import * as Haptics from 'expo-haptics';

// Fire-and-forget: a haptic failing (no vibration motor, simulator, web
// target) should never surface as an app error or block the interaction
// it's decorating.
function fire(action: () => Promise<void>) {
  action().catch(() => {});
}

/**
 * Single choke point for all tactile feedback. Route every trigger through
 * here instead of calling expo-haptics directly, so intent stays consistent
 * and each call site only needs to say *what* happened, not *how* it feels.
 */
export const HapticService = {
  /** Add to Cart, Wishlist Toggle, Pull to Refresh. */
  light: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Remove Item, Quantity Change. */
  medium: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Order Placed, Payment Success. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Payment Failed, API Errors, Validation Errors. */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
