import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { otpSchema, type OtpFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { FormScreen } from '@/src/components/auth/FormScreen';
import { OtpCodeEntry } from '@/src/components/auth/OtpCodeEntry';
import { Button } from '@/src/components/ui';
import { HapticService } from '@/utils/haptics';

// Server-enforced: 1/hour/user resend cap (see backend
// checkResendLimit(userId, "EMAIL_VERIFICATION")) — this is just a client-side
// cooldown so taps aren't obviously wasted in the meantime.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { user, refreshUser } = useAuth();
  ScreenCapture.usePreventScreenCapture('verify-email');
  const [formError, setFormError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const sendCode = async () => {
    if (!user) return;
    setSending(true);
    setSendError(null);
    try {
      await authService.sendEmailVerification({ userId: user.id });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      // Endpoint always replies with a generic "sent if this account exists"
      // message (anti-enumeration) — a thrown error here means the request
      // itself failed (network/rate-limit), not "account not found".
      setSendError(getErrorMessage(err, 'Could not send a verification code'));
    } finally {
      setSending(false);
    }
  };

  // Auto-send on first mount so the dealer doesn't have to tap twice.
  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resend = () => {
    if (resendCooldown > 0) return;
    setResendMessage(null);
    otpForm.reset({ otp: '' });
    sendCode().then(() => setResendMessage('A new code is on its way.'));
    HapticService.light();
  };

  const submitOtp = async (values: OtpFormValues) => {
    if (!user) return;
    setFormError(null);
    try {
      await authService.verifyEmail({ userId: user.id, otp: values.otp });
      HapticService.success();
      await refreshUser();
      router.back();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Invalid or expired code'));
    }
  };

  return (
    <FormScreen
      navTitle="Verify email"
      title="Verify your email"
      subtitle={
        user?.email ? `Enter the 6-digit code we sent to ${user.email}.` : 'Enter the 6-digit code we sent you.'
      }
      onBack={() => router.back()}
      action={
        <Button
          label="Verify email"
          variant="primary"
          fullWidth
          onPress={otpForm.handleSubmit(submitOtp)}
          loading={otpForm.formState.isSubmitting}
        />
      }
    >
      <Controller
        control={otpForm.control}
        name="otp"
        render={({ field }) => (
          <OtpCodeEntry
            value={field.value}
            onChange={field.onChange}
            autoFocus
            error={otpForm.formState.errors.otp?.message ?? formError ?? sendError}
            message={resendMessage}
            resendSecondsLeft={resendCooldown}
            onResend={resend}
            resendDisabled={sending}
          />
        )}
      />
    </FormScreen>
  );
}
