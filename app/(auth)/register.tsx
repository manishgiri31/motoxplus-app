import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { registerSchema, type RegisterFormValues } from '@/auth/validation';
import { Button, Input } from '@/components/ui';
import { logger } from '@/utils/logger';

export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);

  const ownerNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const shopAddressRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const gstRef = useRef<TextInput>(null);
  const panRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: '',
      ownerName: '',
      phone: '',
      email: '',
      password: '',
      state: '',
      city: '',
      gstNumber: '',
      panNumber: '',
      aadhaarNumber: '',
      companyAddress: '',
      shopAddress: '',
      pincode: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting) return;

    setFormError(null);
    try {
      const cleaned = {
        ...values,
        gstNumber: values.gstNumber || undefined,
        panNumber: values.panNumber || undefined,
        aadhaarNumber: values.aadhaarNumber || undefined,
        companyAddress: values.companyAddress || undefined,
        shopAddress: values.shopAddress || undefined,
        pincode: values.pincode || undefined,
      };
      await authService.register(cleaned);
      Alert.alert(
        'Registration submitted',
        "We've emailed you a verification code. Your dealer account will be reviewed and activated after verification.",
        [{ text: 'Go to sign in', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err) {
      logger.error('Registration failed', {
        hasResponse: !!(err as { response?: unknown })?.response,
      });
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="px-2xl py-2xl gap-lg" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="text-[13px] font-semibold uppercase tracking-[3px] text-primary">
              MotoXPlus Dealer
            </Text>
            <Text className="text-h1 font-bold text-text">Create dealer account</Text>
            <Text className="text-body text-muted">
              Company and GST details are used to verify and approve your dealer account.
            </Text>
          </View>

          <Controller
            control={control}
            name="companyName"
            render={({ field, fieldState }) => (
              <Input
                label="Company name"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => ownerNameRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="ownerName"
            render={({ field, fieldState }) => (
              <Input
                ref={ownerNameRef}
                label="Owner name"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <Input
                ref={phoneRef}
                label="Mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                ref={emailRef}
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                ref={passwordRef}
                label="Password"
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                helperText="At least 8 characters"
              />
            )}
          />

          <View className="flex-row gap-md">
            <View className="flex-1">
              <Controller
                control={control}
                name="city"
                render={({ field, fieldState }) => (
                  <Input
                    ref={cityRef}
                    label="City"
                    returnKeyType="next"
                    onSubmitEditing={() => stateRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="state"
                render={({ field, fieldState }) => (
                  <Input
                    ref={stateRef}
                    label="State"
                    returnKeyType="next"
                    onSubmitEditing={() => shopAddressRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="shopAddress"
            render={({ field, fieldState }) => (
              <Input
                ref={shopAddressRef}
                label="Shop address (optional)"
                returnKeyType="next"
                onSubmitEditing={() => pincodeRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="pincode"
            render={({ field, fieldState }) => (
              <Input
                ref={pincodeRef}
                label="Pincode (optional)"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="next"
                onSubmitEditing={() => gstRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Text className="text-h3 font-semibold text-text mt-md">GST details (optional)</Text>
          <Text className="text-body-sm text-muted -mt-sm">
            Adding GST/PAN speeds up dealer approval, but you can also add these later.
          </Text>
          <Controller
            control={control}
            name="gstNumber"
            render={({ field, fieldState }) => (
              <Input
                ref={gstRef}
                label="GST number"
                autoCapitalize="characters"
                returnKeyType="next"
                onSubmitEditing={() => panRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="panNumber"
            render={({ field, fieldState }) => (
              <Input
                ref={panRef}
                label="PAN number"
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          {formError && <Text className="text-[13px] text-danger">{formError}</Text>}

          <Button label="Create account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
