import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/useAuth';
import { loginSchema, type LoginFormValues } from '@/auth/validation';
import { Button, Input } from '@/components/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      // Backend re-detects email vs. mobile from the string itself regardless
      // of which field it arrives in — see motoxplus-web login route.
      await login({ email: values.identifier.trim(), password: values.password });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 423) {
        setFormError(getErrorMessage(err));
        return;
      }
      setFormError(getErrorMessage(err, 'Invalid email/mobile or password'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="flex-1 justify-center px-2xl gap-2xl" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="text-[13px] font-semibold uppercase tracking-wide text-brandred-500">
              MotoXPlus Dealer
            </Text>
            <Text className="text-display font-bold text-black">Welcome back</Text>
            <Text className="text-[15px] text-graytone-500">Sign in to manage your orders</Text>
          </View>

          <View className="gap-lg">
            <Controller
              control={control}
              name="identifier"
              render={({ field, fieldState }) => (
                <Input
                  label="Email or mobile number"
                  autoCapitalize="none"
                  autoComplete="username"
                  keyboardType="email-address"
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
                  label="Password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            {formError && <Text className="text-[13px] text-danger">{formError}</Text>}

            <Link href="/(auth)/forgot-password" className="self-end">
              <Text className="text-[13px] font-semibold text-black">Forgot password?</Text>
            </Link>

            <Button
              label="Sign in"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <View className="flex-row justify-center gap-xs">
            <Text className="text-[14px] text-graytone-500">New dealer?</Text>
            <Link href="/(auth)/register">
              <Text className="text-[14px] font-semibold text-brandred-500">Create an account</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
