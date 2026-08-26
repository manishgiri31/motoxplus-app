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
import { mobileNumberSchema, otpSchema, type MobileNumberFormValues, type OtpFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Button, OtpInput } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { normalizeMobileNumber } from '@/utils/format';
import { HapticService } from '@/utils/haptics';

type Step = 'mobile' | 'otp';

// Server-enforced: 5/hour/user resend cap (checkResendLimit(userId,
// "MOBILE_VERIFICATION")) — client cooldown just avoids obviously-wasted taps.
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyMobileScreen() {
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
            <Text style={styles.title}>Verify your mobile number</Text>
            <Text style={styles.subtitle}>
              {step === 'mobile'
                ? 'Confirm your mobile number to receive a verification code.'
                : `Enter the 6-digit code we sent to ${mobile}.`}
            </Text>
          </View>

          {step === 'mobile' && (
            <View style={styles.form}>
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
              {formError && <Text style={styles.error}>{formError}</Text>}
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
              {formError && <Text style={styles.errorCentered}>{formError}</Text>}
              <Pressable onPress={resendOtp} disabled={resendCooldown > 0} hitSlop={10} accessibilityRole="button" accessibilityLabel="Resend code">
                <Text style={[styles.resendText, { color: resendCooldown > 0 ? colors.muted : colors.red }]}>
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
  successCentered: { fontFamily: fonts.body.regular, fontSize: 13, color: '#1C8A4C', textAlign: 'center' },
  resendText: { fontFamily: fonts.body.medium, fontSize: 13, textAlign: 'center' },
});
