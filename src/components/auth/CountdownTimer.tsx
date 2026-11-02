import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, layout } from '@/src/theme';

export interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
  /** When set, the countdown ends in a tappable resend. Reject to keep it tappable for a retry. */
  onResend?: () => Promise<void>;
  label?: string;
  /** "{label} in Ns" under a minute instead of the MM:SS clock; also left-aligns. */
  compact?: boolean;
}

// Port of the website's countdown-timer.tsx: counts down, then either calls
// onComplete (lockout notices) or turns into a resend button.
export function CountdownTimer({ seconds, onComplete, onResend, label = 'Resend OTP', compact = false }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [resending, setResending] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      completeRef.current?.();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const handleResend = async () => {
    if (!onResend || resending) return;
    setResending(true);
    try {
      await onResend();
      setRemaining(seconds);
    } catch {
      // The caller surfaces its own error; keep the button available for a retry.
    } finally {
      setResending(false);
    }
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  if (remaining > 0) {
    const clock = compact && remaining < 60 ? `${remaining}s` : `${mm}:${ss}`;
    return (
      <Text
        style={[styles.text, !compact && styles.center]}
        accessibilityLabel={`${compact ? label : 'Resend'} in ${remaining} seconds`}
        maxFontSizeMultiplier={1.2}
      >
        {compact ? `${label} in ` : 'Resend in '}
        <Text style={styles.clock}>{clock}</Text>
      </Text>
    );
  }

  // A lockout countdown (no onResend) has nothing to tap once it reaches zero.
  if (!onResend) return null;

  return (
    <Pressable
      onPress={handleResend}
      disabled={resending}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.action, !compact && styles.actionBlock, (pressed || resending) && { opacity: 0.5 }]}
    >
      <Text style={styles.actionLabel} maxFontSizeMultiplier={1.2}>
        {resending ? 'Sending...' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  center: { textAlign: 'center' },
  clock: { ...font(500), color: colors.ink, fontVariant: ['tabular-nums'] },
  action: { minHeight: layout.minTouchTarget - 8, justifyContent: 'center' },
  actionBlock: { alignSelf: 'stretch', alignItems: 'center' },
  actionLabel: { ...font(500), fontSize: 14, lineHeight: 20, color: colors.link },
});
