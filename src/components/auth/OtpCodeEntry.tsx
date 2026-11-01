import { StyleSheet, Text, View } from 'react-native';

import { OtpInput } from '@/src/components/ui/OtpInput';
import { colors, font, space } from '@/src/theme';

import { ResendCodeButton } from './ResendCodeButton';

export interface OtpCodeEntryProps {
  value: string;
  onChange: (value: string) => void;
  /** Validation or server error, shown under the boxes in danger red. The boxes turn red too. */
  error?: string | null;
  /** Positive note, e.g. "A new code is on its way.". */
  message?: string | null;
  resendSecondsLeft: number;
  onResend: () => void;
  resendDisabled?: boolean;
  autoFocus?: boolean;
}

// The code-entry block shared by every verification screen (forgot password,
// verify email, verify mobile): the six boxes, the status line and the resend
// control. The screen owns the title, the primary button and the API calls.
export function OtpCodeEntry({
  value,
  onChange,
  error,
  message,
  resendSecondsLeft,
  onResend,
  resendDisabled,
  autoFocus,
}: OtpCodeEntryProps) {
  return (
    <View style={styles.wrap}>
      <OtpInput value={value} onChange={onChange} autoFocus={autoFocus} error={!!error} />
      {!!error && (
        <Text style={[styles.status, styles.error]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {error}
        </Text>
      )}
      {!error && !!message && (
        <Text style={[styles.status, styles.message]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {message}
        </Text>
      )}
      <ResendCodeButton secondsLeft={resendSecondsLeft} onPress={onResend} disabled={resendDisabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  status: { ...font(400), fontSize: 14, lineHeight: 20, textAlign: 'center' },
  error: { color: colors.red },
  message: { color: colors.success },
});
