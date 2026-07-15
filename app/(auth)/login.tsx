import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/useAuth';
import { loginSchema, type LoginFormValues } from '@/auth/validation';
import { Button, Input } from '@/components/ui';
import { BUILD_DATE, BUILD_ID } from '@/utils/buildInfo';
import { logger } from '@/utils/logger';
import { runConnectivityDiagnostics } from '@/utils/networkDiagnostics';

export default function LoginScreen() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    // Belt-and-suspenders duplicate-submit guard — the Button is already
    // disabled while isSubmitting, but that flips one render after the first
    // tap, which is enough time for a fast double-tap to fire onSubmit twice.
    if (isSubmitting) return;

    setFormError(null);
    try {
      // eslint-disable-next-line no-console
      console.log('STEP 1');

      // One-time network audit instrumentation (see AGENTS task tracking the
      // "hasResponse: false" investigation) — dev-only pre-flight so a dead
      // connection is caught and fully logged before it gets conflated with
      // an auth failure. Remove once the root cause is confirmed fixed.
      if (__DEV__) {
        const reachable = await runConnectivityDiagnostics();
        if (!reachable) {
          setFormError('Could not reach motoxplus.com at all (see Metro logs for diagnostics).');
          return;
        }
      }

      // Backend re-detects email vs. mobile from the string itself regardless
      // of which field it arrives in — see motoxplus-web login route.
      await login({ email: values.identifier.trim(), password: values.password });
    } catch (err) {
      logger.error('Login failed', {
        // Never log the password. Status/code is enough to diagnose from here.
        hasResponse: !!(err as { response?: unknown })?.response,
      });
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="flex-1 justify-center px-2xl gap-2xl" keyboardShouldPersistTaps="handled">
          {__DEV__ && (
            <View className="bg-danger/10 px-sm py-xs rounded-md">
              <Text className="text-[11px] font-mono text-danger">DEV BUILD</Text>
              <Text className="text-[11px] font-mono text-danger">{BUILD_DATE}</Text>
              <Text className="text-[11px] font-mono text-danger">{BUILD_ID}</Text>
            </View>
          )}
          <View className="gap-xs">
            <Text className="text-[13px] font-semibold uppercase tracking-[3px] text-primary">
              MotoXPlus Dealer
            </Text>
            <Text className="text-[40px] leading-[44px] font-extrabold text-text -tracking-wide">
              Welcome Back
            </Text>
            <Text className="text-[16px] text-muted mt-xs">Sign in to manage your business</Text>
          </View>

          <View className="gap-lg">
            <Controller
              control={control}
              name="identifier"
              render={({ field, fieldState }) => (
                <Input
                  label="Email or mobile number"
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="username"
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
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            {formError && <Text className="text-[13px] text-danger">{formError}</Text>}

            <Link href="/(auth)/forgot-password" className="self-end">
              <Text className="text-[13px] font-semibold text-text">Forgot password?</Text>
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
            <Text className="text-[14px] text-muted">New dealer?</Text>
            <Link href="/(auth)/register">
              <Text className="text-[14px] font-semibold text-primary">Create an account</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
