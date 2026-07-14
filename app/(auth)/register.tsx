import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authService } from '@/api/services/authService';
import { getErrorMessage } from '@/api/errors';
import { registerSchema, type RegisterFormValues } from '@/auth/validation';
import { Button, Input } from '@/components/ui';

export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);

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
      setFormError(getErrorMessage(err, 'Registration failed'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="px-2xl py-2xl gap-lg" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="text-[13px] font-semibold uppercase tracking-wide text-brandred-500">
              MotoXPlus Dealer
            </Text>
            <Text className="text-h1 font-bold text-black">Create dealer account</Text>
            <Text className="text-body text-graytone-500">
              Company and GST details are used to verify and approve your dealer account.
            </Text>
          </View>

          <Controller
            control={control}
            name="companyName"
            render={({ field, fieldState }) => (
              <Input label="Company name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="ownerName"
            render={({ field, fieldState }) => (
              <Input label="Owner name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <Input label="Mobile number" keyboardType="phone-pad" maxLength={10} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input label="Password" secureTextEntry autoCapitalize="none" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} helperText="At least 8 characters" />
            )}
          />

          <View className="flex-row gap-md">
            <View className="flex-1">
              <Controller
                control={control}
                name="city"
                render={({ field, fieldState }) => (
                  <Input label="City" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="state"
                render={({ field, fieldState }) => (
                  <Input label="State" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="shopAddress"
            render={({ field, fieldState }) => (
              <Input label="Shop address (optional)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="pincode"
            render={({ field, fieldState }) => (
              <Input label="Pincode (optional)" keyboardType="number-pad" maxLength={6} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />

          <Text className="text-h3 font-semibold text-black mt-md">GST details (optional)</Text>
          <Text className="text-body-sm text-graytone-500 -mt-sm">
            Adding GST/PAN speeds up dealer approval, but you can also add these later.
          </Text>
          <Controller
            control={control}
            name="gstNumber"
            render={({ field, fieldState }) => (
              <Input label="GST number" autoCapitalize="characters" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={control}
            name="panNumber"
            render={({ field, fieldState }) => (
              <Input label="PAN number" autoCapitalize="characters" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
            )}
          />

          {formError && <Text className="text-[13px] text-danger">{formError}</Text>}

          <Button label="Create account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
