import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import {
  forgotPasswordRequestSchema,
  newPasswordSchema,
  otpSchema,
  type ForgotPasswordRequestValues,
  type NewPasswordFormValues,
  type OtpFormValues,
} from '@/auth/validation';
import { Input } from '@/components/ui';
import { Button, OtpInput } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

type Step = 'request' | 'otp' | 'reset';

// OTP resend is capped at 1/hour/user server-side (docs/api.md §12) — this
// client-side cooldown just prevents obviously-wasted taps in the meantime.
const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordScreen() {
  // The otp/reset steps carry a password-reset OTP and a new password.
  ScreenCapture.usePreventScreenCapture('forgot-password');
  const [step, setStep] = useState<Step>('request');
  const [userId, setUserId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState<{ value: string; isMobile: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const confirmPasswordRef = useRef<TextInput>(null);

  const requestForm = useForm<ForgotPasswordRequestValues>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { identifier: '' },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const resetForm = useForm<NewPasswordFormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const submitRequest = async (values: ForgotPasswordRequestValues) => {
    setFormError(null);
    try {
      const isMobile = /^[6-9]\d{9}$/.test(values.identifier.trim());
      const trimmed = values.identifier.trim();
      const res = await authService.forgotPassword(
        isMobile ? { mobile: trimmed, method: 'mobile' } : { email: trimmed, method: 'email' }
      );
      if (!res.userId) {
        setFormError("We couldn't find an account with those details.");
        return;
      }
      setUserId(res.userId);
      setIdentifier({ value: trimmed, isMobile });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('otp');
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const resendOtp = async () => {
    if (!identifier || resendCooldown > 0) return;
    setFormError(null);
    setResendMessage(null);
    try {
      await authService.forgotPassword(
        identifier.isMobile ? { mobile: identifier.value, method: 'mobile' } : { email: identifier.value, method: 'email' }
      );
      otpForm.reset({ otp: '' });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendMessage('A new code is on its way.');
      HapticService.light();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not resend the code'));
    }
  };

  const goBack = () => {
    setFormError(null);
    setResendMessage(null);
    if (step === 'otp') {
      setStep('request');
    } else if (step === 'reset') {
      setStep('otp');
    } else {
      router.back();
    }
  };

  // Keep Android hardware back inside the flow instead of unmounting the
  // screen (and losing userId/resetToken) once the dealer is past the first step.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'request') return false;
      setFormError(null);
      setResendMessage(null);
      setStep((s) => (s === 'reset' ? 'otp' : 'request'));
      return true;
    });
    return () => sub.remove();
  }, [step]);

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  const submitOtp = async (values: OtpFormValues) => {
    if (!userId) return;
    setFormError(null);
    try {
      const res = await authService.verifyForgotPasswordOtp({ userId, otp: values.otp });
      setResetToken(res.resetToken);
      setStep('reset');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Invalid or expired code'));
    }
  };

  const submitReset = async (values: NewPasswordFormValues) => {
    if (!userId || !resetToken) return;
    setFormError(null);
    try {
      await authService.resetPassword({ userId, resetToken, newPassword: values.newPassword });
      router.replace('/(auth)/login');
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              {step === 'request' && 'Enter your email or mobile number to receive a code.'}
              {step === 'otp' && 'Enter the 6-digit code we sent you.'}
              {step === 'reset' && 'Choose a new password for your account.'}
            </Text>
          </View>

          {step === 'request' && (
            <View style={styles.form}>
              <Controller
                control={requestForm.control}
                name="identifier"
                render={({ field, fieldState }) => (
                  <Input
                    label="Email or mobile number"
                    autoFocus
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={requestForm.handleSubmit(submitRequest)}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              {formError && <Text style={styles.error}>{formError}</Text>}
              <Button
                label="Send code"
                variant="brand"
                fullWidth
                onPress={requestForm.handleSubmit(submitRequest)}
                loading={requestForm.formState.isSubmitting}
              />
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.form}>
              <Controller
                control={otpForm.control}
                name="otp"
                render={({ field }) => <OtpInput value={field.value} onChange={field.onChange} autoFocus />}
              />
              {otpForm.formState.errors.otp && (
                <Text style={styles.errorCentered}>{otpForm.formState.errors.otp.message}</Text>
              )}
              {resendMessage && <Text style={styles.success}>{resendMessage}</Text>}
              {formError && <Text style={styles.error}>{formError}</Text>}
              <Pressable onPress={resendOtp} disabled={resendCooldown > 0} hitSlop={10} accessibilityRole="button" accessibilityLabel="Resend code">
                <Text style={[styles.resendText, { color: resendCooldown > 0 ? colors.muted : colors.red }]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </Pressable>
              <Button
                label="Verify code"
                variant="brand"
                fullWidth
                onPress={otpForm.handleSubmit(submitOtp)}
                loading={otpForm.formState.isSubmitting}
              />
            </View>
          )}

          {step === 'reset' && (
            <View style={styles.form}>
              <Controller
                control={resetForm.control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <Input
                    label="New password"
                    autoFocus
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={resetForm.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <Input
                    ref={confirmPasswordRef}
                    label="Confirm new password"
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={resetForm.handleSubmit(submitReset)}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              {formError && <Text style={styles.error}>{formError}</Text>}
              <Button
                label="Reset password"
                variant="brand"
                fullWidth
                onPress={resetForm.handleSubmit(submitReset)}
                loading={resetForm.formState.isSubmitting}
              />
            </View>
          )}
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
  error: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.red },
  errorCentered: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.red, textAlign: 'center' },
  success: { fontFamily: fonts.body.regular, fontSize: 13, color: '#1C8A4C' },
  resendText: { fontFamily: fonts.body.medium, fontSize: 13, textAlign: 'center' },
});
