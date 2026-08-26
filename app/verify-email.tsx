import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { otpSchema, type OtpFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Button, OtpInput } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              {user?.email
                ? `Enter the 6-digit code we sent to ${user.email}.`
                : 'Enter the 6-digit code we sent you.'}
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={otpForm.control}
              name="otp"
              render={({ field }) => <OtpInput value={field.value} onChange={field.onChange} autoFocus />}
            />
            {otpForm.formState.errors.otp && (
              <Text style={styles.errorCentered}>{otpForm.formState.errors.otp.message}</Text>
            )}
            {resendMessage && <Text style={styles.successCentered}>{resendMessage}</Text>}
            {(formError || sendError) && <Text style={styles.errorCentered}>{formError ?? sendError}</Text>}
            <Pressable
              onPress={resend}
              disabled={resendCooldown > 0 || sending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Resend code"
            >
              <Text style={[styles.resendText, { color: resendCooldown > 0 ? colors.muted : colors.red }]}>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  backButton: { alignSelf: 'flex-start', marginLeft: 16, marginTop: 8, padding: 4 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 },
  header: { gap: 6 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 30, lineHeight: 36, color: colors.ink },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.muted, marginTop: 4 },
  form: { gap: 16 },
  errorCentered: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.red, textAlign: 'center' },
  successCentered: { fontFamily: fonts.body.regular, fontSize: 13, color: '#1C8A4C', textAlign: 'center' },
  resendText: { fontFamily: fonts.body.medium, fontSize: 13, textAlign: 'center' },
});
