import { Easing } from 'react-native-reanimated';

// Motion tokens. All UI transitions sit in the 240-320ms band and share one
// ease, cubic-bezier(.4, 0, .6, 1). `cubicBezier` is the raw control-point
// tuple for APIs that want numbers (Easing.bezier(...cubicBezier)); `easing`
// is that curve ready to pass to reanimated's withTiming.
export const motion = {
  duration: { fast: 240, base: 280, slow: 320 },
  cubicBezier: [0.4, 0, 0.6, 1] as const,
  easing: Easing.bezier(0.4, 0, 0.6, 1),
  // Interactions that must feel instant (press feedback) — deliberately shorter
  // than the 240ms floor above, which is for transitions, not press states.
  press: 120,
  pressScale: 0.98,
} as const;

export type Motion = typeof motion;
