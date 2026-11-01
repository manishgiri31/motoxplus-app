import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, layout } from '@/src/theme';

export interface ResendCodeButtonProps {
  /** Seconds left before another code can be requested; 0 enables the button. */
  secondsLeft: number;
  onPress: () => void;
  /** Extra reason to block a resend, e.g. a request already in flight. */
  disabled?: boolean;
}

// "Resend code in 30s" in ink2 while counting down; accent once it can be
// tapped. The label carries the countdown for sighted users; assistive tech
// gets a stable "Resend code" label plus the wait as a hint, so it isn't
// re-announced every second.
export function ResendCodeButton({ secondsLeft, onPress, disabled = false }: ResendCodeButtonProps) {
  const waiting = secondsLeft > 0;
  const blocked = waiting || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel="Resend code"
      accessibilityHint={waiting ? `Available in ${secondsLeft} seconds` : undefined}
      accessibilityState={{ disabled: blocked }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={[styles.label, { color: blocked ? colors.ink2 : colors.accent }]} maxFontSizeMultiplier={1.2}>
        {waiting ? `Resend code in ${secondsLeft}s` : 'Resend code'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: layout.minTouchTarget, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  pressed: { opacity: 0.6 },
  label: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34 },
});
