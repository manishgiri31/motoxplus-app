import { StyleSheet, Text, View } from 'react-native';

import { OtpInput } from '@/src/components/ui/OtpInput';
import { colors, font, space } from '@/src/theme';

import { AuthAlert, AuthHeading, Spinner, TextAction } from './AuthUI';
import { CountdownTimer } from './CountdownTimer';

// How long "Resend code" stays disabled after a send. Deliberately much
// shorter than the code's 5 minute life: the cooldown only stops accidental
// double-sends. Per-account and per-IP limits are enforced server-side.
export const RESEND_COOLDOWN_SECONDS = 60;

export interface AuthOtpStepProps {
  /** Masked destination, e.g. "+91 ••••• ••10" or "r***@shop.in": never the raw value. */
  destination: string;
  channel: 'WhatsApp' | 'email';
  otp: string;
  onOtpChange: (v: string) => void;
  status: 'idle' | 'loading' | 'error';
  error: string;
  /** Changing this restarts the resend countdown. */
  timerKey: number;
  onResend: () => Promise<void>;
  onBack: () => void;
  backLabel: string;
}

// The "enter the 6-digit code" step of the website's sign-in. The caller
// submits as soon as the sixth digit lands, so there is no Verify button.
export function AuthOtpStep({ destination, channel, otp, onOtpChange, status, error, timerKey, onResend, onBack, backLabel }: AuthOtpStepProps) {
  return (
    <View>
      <AuthHeading
        title="Enter the code"
        subtitle={
          <>
            {'We sent a 6-digit code to '}
            <Text style={styles.destination}>{destination}</Text>
            {` on ${channel}. It expires in 5 minutes.`}
          </>
        }
      />
      <View style={styles.body}>
        <OtpInput value={otp} onChange={onOtpChange} autoFocus error={!!error} />
        <View style={styles.status} accessibilityLiveRegion="polite">
          {status === 'loading' && (
            <View style={styles.verifying}>
              <Spinner />
              <Text style={styles.verifyingText} maxFontSizeMultiplier={1.2}>
                Verifying...
              </Text>
            </View>
          )}
          {!!error && status !== 'loading' && <AuthAlert>{error}</AuthAlert>}
        </View>
        <View style={styles.footer}>
          <CountdownTimer key={timerKey} seconds={RESEND_COOLDOWN_SECONDS} onResend={onResend} label="Resend code" compact />
          <TextAction label={backLabel} icon="chevron-left" onPress={onBack} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  destination: { ...font(600), color: colors.ink },
  body: { gap: space.xl },
  status: { minHeight: 20 },
  verifying: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  verifyingText: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
