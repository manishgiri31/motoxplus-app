import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { BackHandler, StyleSheet, View, type TextInput } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { type SharedValue } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { getPasswordStrength } from '@/auth/passwordStrength';
import {
  forgotPasswordRequestSchema,
  newPasswordSchema,
  otpSchema,
  type ForgotPasswordRequestValues,
  type NewPasswordFormValues,
  type OtpFormValues,
} from '@/auth/validation';
import { OtpCodeEntry } from '@/src/components/auth/OtpCodeEntry';
import { PasswordStrengthMeter } from '@/src/components/auth/PasswordStrengthMeter';
import { ACTION_NAV_HEIGHT, ActionNavBar } from '@/src/components/ui/ActionNavBar';
import { Button } from '@/src/components/ui/Button';
import { GroupedList } from '@/src/components/ui/GroupedList';
import { InputField } from '@/src/components/ui/InputField';
import { LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { StepStage } from '@/src/components/ui/StepStage';
import { Toast } from '@/src/components/ui/Toast';
import { screenPaddingX, space, colors } from '@/src/theme';
import { HapticService } from '@/utils/haptics';
import { maskContact } from '@/utils/maskContact';

type Step = 'request' | 'otp' | 'reset';

const STEPS: Step[] = ['request', 'otp', 'reset'];

// OTP resend is capped at 1/hour/user server-side (docs/api.md §12) — this
// client-side cooldown just prevents obviously-wasted taps in the meantime.
const RESEND_COOLDOWN_SECONDS = 60;

// Bottom bar = 8 top padding + 50pt button + 16 bottom padding.
const BOTTOM_BAR_HEIGHT = 74;

export default function ForgotPasswordScreen() {
  // The otp/reset steps carry a password-reset OTP and a new password.
  ScreenCapture.usePreventScreenCapture('forgot-password');
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useLargeTitleScroll();
  const [step, setStep] = useState<Step>('request');
  const [userId, setUserId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState<{ value: string; isMobile: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  // Set once the password is changed: the success toast is showing and the
  // screen leaves for login when it hides, so the flow can't be re-entered.
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const identifierRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
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

  const newPassword = resetForm.watch('newPassword');
  const confirmPassword = resetForm.watch('confirmPassword');
  const strength = getPasswordStrength(newPassword);
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canReset = strength.ok && confirmPassword.length > 0 && !mismatch;

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
    if (done) return;
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
      if (done) return true;
      if (step === 'request') return false;
      setFormError(null);
      setResendMessage(null);
      setStep((s) => (s === 'reset' ? 'otp' : 'request'));
      return true;
    });
    return () => sub.remove();
  }, [step, done]);

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  // Every step is mounted at once on the sliding track, so focus is moved by
  // hand: the OTP boxes take it through OtpInput's autoFocus prop, the text
  // steps here. The inline title in the nav bar restarts from the top too.
  useEffect(() => {
    scrollY.value = 0;
    const target = step === 'request' ? identifierRef : step === 'reset' ? newPasswordRef : null;
    if (!target) return;
    const t = setTimeout(() => target.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [step, scrollY]);

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
      HapticService.success();
      setDone(true);
      setToast('Password updated. Sign in with your new password.');
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const resetError =
    (mismatch ? "Passwords don't match" : null) ??
    resetForm.formState.errors.newPassword?.message ??
    resetForm.formState.errors.confirmPassword?.message ??
    (step === 'reset' ? formError : null);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* keyboard-controller: also correct on edge-to-edge Android. */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <StepStage index={STEPS.indexOf(step)}>
          <Panel
            title="Reset password"
            subtitle="Enter the email or mobile number on your account and we'll send you a code."
            scrollY={scrollY}
            onScroll={onScroll}
            action={
              <Button
                label="Send code"
                variant="primary"
                fullWidth
                onPress={requestForm.handleSubmit(submitRequest)}
                loading={requestForm.formState.isSubmitting}
              />
            }
          >
            <GroupedList
              footer={requestForm.formState.errors.identifier?.message ?? (step === 'request' ? formError : null)}
              footerTone="danger"
            >
              <Controller
                control={requestForm.control}
                name="identifier"
                render={({ field, fieldState }) => (
                  <InputField
                    ref={identifierRef}
                    variant="grouped"
                    label="Email or mobile number"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    keyboardType="email-address"
                    returnKeyType="go"
                    onSubmitEditing={requestForm.handleSubmit(submitRequest)}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!fieldState.error || (step === 'request' && !!formError)}
                  />
                )}
              />
            </GroupedList>
          </Panel>

          <Panel
            title="Enter the 6-digit code"
            subtitle={identifier ? `We sent a code to ${maskContact(identifier.value, identifier.isMobile)}.` : undefined}
            scrollY={scrollY}
            onScroll={onScroll}
            action={
              <Button
                label="Verify code"
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
                  autoFocus={step === 'otp'}
                  error={otpForm.formState.errors.otp?.message ?? (step === 'otp' ? formError : null)}
                  message={resendMessage}
                  resendSecondsLeft={resendCooldown}
                  onResend={resendOtp}
                />
              )}
            />
          </Panel>

          <Panel
            title="Create a new password"
            subtitle="Use at least 8 characters with a mix of letters and numbers."
            scrollY={scrollY}
            onScroll={onScroll}
            action={
              <Button
                label="Reset password"
                variant="primary"
                fullWidth
                disabled={!canReset || done}
                onPress={resetForm.handleSubmit(submitReset)}
                loading={resetForm.formState.isSubmitting}
              />
            }
          >
            <GroupedList footer={resetError} footerTone="danger">
              <Controller
                control={resetForm.control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <InputField
                    ref={newPasswordRef}
                    variant="grouped"
                    label="New password"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!fieldState.error}
                  />
                )}
              />
              <Controller
                control={resetForm.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <InputField
                    ref={confirmPasswordRef}
                    variant="grouped"
                    label="Confirm new password"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="go"
                    onSubmitEditing={canReset ? resetForm.handleSubmit(submitReset) : undefined}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!fieldState.error || mismatch}
                  />
                )}
              />
            </GroupedList>
            <PasswordStrengthMeter strength={strength} />
          </Panel>
        </StepStage>
      </KeyboardAvoidingView>

      <ActionNavBar title="Reset password" onBack={goBack} scrollY={scrollY} />

      {toast && (
        <Toast
          message={toast}
          bottomOffset={insets.bottom + BOTTOM_BAR_HEIGHT + space.md}
          onHide={() => {
            setToast(null);
            router.replace('/(auth)/login');
          }}
        />
      )}
    </SafeAreaView>
  );
}

interface PanelProps {
  title: string;
  subtitle?: string;
  scrollY: SharedValue<number>;
  onScroll: ReturnType<typeof useLargeTitleScroll>['onScroll'];
  /** The step's primary button, pinned above the keyboard / home indicator. */
  action: ReactNode;
  children: ReactNode;
}

// One step: large title, the step's fields, and the pinned primary action.
function Panel({ title, subtitle, scrollY, onScroll, action, children }: PanelProps) {
  return (
    <View style={styles.flex}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bottomOffset={space.lg}
      >
        <LargeTitleHeader title={title} subtitle={subtitle} scrollY={scrollY} />
        <View style={styles.form}>{children}</View>
      </KeyboardAwareScrollView>
      <View style={styles.bottomBar}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  // Clears the 44pt nav bar that overlays the top of the scroll view.
  content: { paddingTop: ACTION_NAV_HEIGHT + space.xl, paddingBottom: space.xl, gap: space.xxl },
  form: { paddingHorizontal: screenPaddingX, gap: space.md },
  bottomBar: { paddingHorizontal: screenPaddingX, paddingTop: space.sm, paddingBottom: space.lg },
});
