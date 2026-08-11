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
import { mobileNumberSchema, otpSchema, type MobileNumberFormValues, type OtpFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Button, OtpInput } from '@/src/components/ui';
import { colors as themeColors } from '@/src/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { normalizeMobileNumber } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

type Step = 'mobile' | 'otp';

// Server-enforced: 5/hour/user resend cap (checkResendLimit(userId,
// "MOBILE_VERIFICATION")) — client cooldown just avoids obviously-wasted taps.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyMobileScreen() {
  const colors = useThemeColors();
  const { dealer, refreshUser } = useAuth();
  ScreenCapture.usePreventScreenCapture('verify-mobile');
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const mobileForm = useForm<MobileNumberFormValues>({
    resolver: zodResolver(mobileNumberSchema),
    defaultValues: { mobile: normalizeMobileNumber(dealer?.phone) },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const submitMobile = async (values: MobileNumberFormValues) => {
    setFormError(null);
    try {
      await authService.sendMobileOtp({ mobile: values.mobile });
      setMobile(values.mobile);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('otp');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not send a verification code'));
    }
  };

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  const resendOtp = async () => {
    if (!mobile || resendCooldown > 0) return;
    setFormError(null);
    setResendMessage(null);
    try {
      await authService.sendMobileOtp({ mobile });
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
      setStep('mobile');
    } else {
      router.back();
    }
  };

  const submitOtp = async (values: OtpFormValues) => {
    setFormError(null);
    try {
      await authService.verifyMobile({ otp: values.otp });
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
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="self-start ml-lg mt-sm p-xs"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <ScrollView contentContainerClassName="flex-1 justify-center px-2xl gap-2xl" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="text-h1 font-bold text-text">Verify your mobile number</Text>
            <Text className="text-body text-muted">
              {step === 'mobile'
                ? 'Confirm your mobile number to receive a verification code.'
                : `Enter the 6-digit code we sent to ${mobile}.`}
            </Text>
          </View>

          {step === 'mobile' && (
            <View className="gap-lg">
              <Controller
                control={mobileForm.control}
                name="mobile"
                render={({ field, fieldState }) => (
                  <Input
                    label="Mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                    returnKeyType="go"
                    onSubmitEditing={mobileForm.handleSubmit(submitMobile)}
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
                variant="brand"
                fullWidth
                onPress={mobileForm.handleSubmit(submitMobile)}
                loading={mobileForm.formState.isSubmitting}
              />
            </View>
          )}

          {step === 'otp' && (
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
              {formError && <Text className="text-[13px] text-danger text-center">{formError}</Text>}
              <Pressable onPress={resendOtp} disabled={resendCooldown > 0} hitSlop={10} accessibilityRole="button" accessibilityLabel="Resend code">
                <Text
                  className="text-[13px] text-center font-medium"
                  style={{ color: resendCooldown > 0 ? themeColors.muted : themeColors.red }}
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </Text>
              </Pressable>
              <Button
                label="Verify mobile"
                variant="brand"
                fullWidth
                onPress={otpForm.handleSubmit(submitOtp)}
                loading={otpForm.formState.isSubmitting}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
