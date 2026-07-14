import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
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
import { Button, Input } from '@/components/ui';

type Step = 'request' | 'otp' | 'reset';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('request');
  const [userId, setUserId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
      const res = await authService.forgotPassword(
        isMobile
          ? { mobile: values.identifier.trim(), method: 'mobile' }
          : { email: values.identifier.trim(), method: 'email' }
      );
      if (!res.userId) {
        setFormError("We couldn't find an account with those details.");
        return;
      }
      setUserId(res.userId);
      setStep('otp');
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="flex-1 justify-center px-2xl gap-2xl" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="text-h1 font-bold text-text">Reset password</Text>
            <Text className="text-body text-muted">
              {step === 'request' && 'Enter your email or mobile number to receive a code.'}
              {step === 'otp' && 'Enter the 6-digit code we sent you.'}
              {step === 'reset' && 'Choose a new password for your account.'}
            </Text>
          </View>

          {step === 'request' && (
            <View className="gap-lg">
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
              {formError && <Text className="text-[13px] text-danger">{formError}</Text>}
              <Button
                label="Send code"
                onPress={requestForm.handleSubmit(submitRequest)}
                loading={requestForm.formState.isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
          )}

          {step === 'otp' && (
            <View className="gap-lg">
              <Controller
                control={otpForm.control}
                name="otp"
                render={({ field, fieldState }) => (
                  <Input
                    label="6-digit code"
                    autoFocus
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="go"
                    onSubmitEditing={otpForm.handleSubmit(submitOtp)}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              {formError && <Text className="text-[13px] text-danger">{formError}</Text>}
              <Button
                label="Verify code"
                onPress={otpForm.handleSubmit(submitOtp)}
                loading={otpForm.formState.isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
          )}

          {step === 'reset' && (
            <View className="gap-lg">
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
              {formError && <Text className="text-[13px] text-danger">{formError}</Text>}
              <Button
                label="Reset password"
                onPress={resetForm.handleSubmit(submitReset)}
                loading={resetForm.formState.isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
