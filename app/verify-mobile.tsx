import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { mobileNumberSchema, otpSchema, type MobileNumberFormValues, type OtpFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { FormScreen } from '@/src/components/auth/FormScreen';
import { OtpCodeEntry } from '@/src/components/auth/OtpCodeEntry';
import { Button, GroupedList, InputField } from '@/src/components/ui';
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

  const isMobileStep = step === 'mobile';
  const mobileError = mobileForm.formState.errors.mobile?.message ?? formError;

  return (
    <FormScreen
      navTitle="Verify mobile"
      title="Verify your mobile number"
      subtitle={
        isMobileStep
          ? 'Confirm your mobile number to receive a verification code.'
          : `Enter the 6-digit code we sent to ${mobile}.`
      }
      onBack={goBack}
      action={
        isMobileStep ? (
          <Button
            label="Send code"
            variant="primary"
            fullWidth
            onPress={mobileForm.handleSubmit(submitMobile)}
            loading={mobileForm.formState.isSubmitting}
          />
        ) : (
          <Button
            label="Verify mobile"
            variant="primary"
            fullWidth
            onPress={otpForm.handleSubmit(submitOtp)}
            loading={otpForm.formState.isSubmitting}
          />
        )
      }
    >
      {isMobileStep ? (
        <GroupedList footer={mobileError} footerTone="danger">
          <Controller
            control={mobileForm.control}
            name="mobile"
            render={({ field, fieldState }) => (
              <InputField
                variant="grouped"
                label="Mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={mobileForm.handleSubmit(submitMobile)}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!fieldState.error || !!formError}
              />
            )}
          />
        </GroupedList>
      ) : (
        <Controller
          control={otpForm.control}
          name="otp"
          render={({ field }) => (
            <OtpCodeEntry
              value={field.value}
              onChange={field.onChange}
              autoFocus
              error={otpForm.formState.errors.otp?.message ?? formError}
              message={resendMessage}
              resendSecondsLeft={resendCooldown}
              onResend={resendOtp}
            />
          )}
        />
      )}
    </FormScreen>
  );
}
