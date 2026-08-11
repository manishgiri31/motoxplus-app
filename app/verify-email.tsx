import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { otpSchema, type OtpFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Button, OtpInput } from '@/src/components/ui';
import { colors as themeColors } from '@/src/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { HapticService } from '@/utils/haptics';

// Server-enforced: 1/hour/user resend cap (see backend
// checkResendLimit(userId, "EMAIL_VERIFICATION")) — this is just a client-side
// cooldown so taps aren't obviously wasted in the meantime.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const colors = useThemeColors();
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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="self-start ml-lg mt-sm p-xs"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <ScrollView contentContainerClassName="flex-1 justify-center px-2xl gap-2xl" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="text-h1 font-bold text-text">Verify your email</Text>
            <Text className="text-body text-muted">
              {user?.email
                ? `Enter the 6-digit code we sent to ${user.email}.`
                : 'Enter the 6-digit code we sent you.'}
            </Text>
          </View>

          <View className="gap-lg">
            <Controller
              control={otpForm.control}
              name="otp"
              render={({ field }) => <OtpInput value={field.value} onChange={field.onChange} autoFocus />}
            />
            {otpForm.formState.errors.otp && (
              <Text className="text-[13px] text-danger text-center">{otpForm.formState.errors.otp.message}</Text>
            )}
            {resendMessage && <Text className="text-[13px] text-success text-center">{resendMessage}</Text>}
            {(formError || sendError) && (
              <Text className="text-[13px] text-danger text-center">{formError ?? sendError}</Text>
            )}
            <Pressable
              onPress={resend}
              disabled={resendCooldown > 0 || sending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Resend code"
            >
              <Text
                className="text-[13px] text-center font-medium"
                style={{ color: resendCooldown > 0 ? themeColors.muted : themeColors.red }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </Text>
            </Pressable>
            <Button
              label="Verify email"
              variant="brand"
              fullWidth
              onPress={otpForm.handleSubmit(submitOtp)}
              loading={otpForm.formState.isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
