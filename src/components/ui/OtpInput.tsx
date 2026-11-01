import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, font, radii } from '@/src/theme';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Focuses the input on mount and again whenever this flips to true; flipping to false blurs it. */
  autoFocus?: boolean;
  /** Red boxes, for a rejected or invalid code. */
  error?: boolean;
  accessibilityLabel?: string;
}

// One invisible TextInput stretched over the row drives the real keyboard,
// auto-advance and paste (long-press shows the system Paste menu, one-time-code
// autofill fills it); the boxes are a visual projection of its value. Taps land
// on the input itself, so VoiceOver / TalkBack get a real, full-size text field
// and the six boxes stay out of the accessibility tree.
export function OtpInput({
  length = 6,
  value,
  onChange,
  autoFocus,
  error = false,
  accessibilityLabel = `${length}-digit code`,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');

  useEffect(() => {
    if (autoFocus === undefined) return;
    if (autoFocus) inputRef.current?.focus();
    else inputRef.current?.blur();
  }, [autoFocus]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {Array.from({ length }).map((_, i) => {
          const active = focused && i === Math.min(digits.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                active && styles.boxActive,
                error && styles.boxError,
                // Accent border + 4px ring on the box being typed into.
                active && !error && { boxShadow: `0 0 0 4px ${colors.focusRing}` },
              ]}
            >
              <Text style={styles.digit} maxFontSizeMultiplier={1.2}>
                {digits[i] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        // No maxLength: a pasted "123 456" must reach this handler whole so the
        // separator can be dropped before the slice.
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        autoCorrect={false}
        caretHidden
        selectionColor="transparent"
        style={styles.hiddenInput}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={`${digits.length} of ${length} digits entered`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  // 52x60 at full width; on narrow phones the boxes shrink (never below 44pt).
  box: {
    flex: 1,
    minWidth: 44,
    maxWidth: 52,
    height: 60,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  boxActive: { borderColor: colors.accent },
  boxError: { borderColor: colors.red },
  digit: { ...font(600), fontSize: 28, lineHeight: 34, letterSpacing: -0.56, color: colors.ink },
  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0, color: 'transparent' },
});
