import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { DEALER_APPLICATION_URL, DealerAccessDeniedError } from '@/auth/access';
import { useAuth } from '@/auth/useAuth';
import { loginSchema, type LoginFormValues } from '@/auth/validation';
import { Button, GroupedList, InputField, LargeTitleHeader } from '@/src/components/ui';
import { colors, font, screenPaddingX, space } from '@/src/theme';
import { logger } from '@/utils/logger';
import { runConnectivityDiagnostics } from '@/utils/networkDiagnostics';

export default function LoginScreen() {
  const { login, accessDenied } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // The secondary actions below the Sign in button step aside while the
  // keyboard is open, so the form and the primary action always fit.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // AuthProvider sets accessDenied both from a failed login attempt and from
  // a rejected cold-start session restore — this is the single place that
  // reacts to it, so both cases land on the same Access Denied screen.
  useEffect(() => {
    if (accessDenied) {
      router.replace('/(auth)/access-denied');
    }
  }, [accessDenied]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
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
      // Dev-only pre-flight so a dead connection is caught and fully logged
      // before it gets conflated with an auth failure. No-op in production
      // builds (see utils/networkDiagnostics.ts).
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
      if (err instanceof DealerAccessDeniedError) {
        // Don't show an inline form error here — the accessDenied effect
        // above is about to replace this screen with the dedicated
        // Access Denied screen.
        return;
      }
      logger.error('Login failed', {
        // Never log the password. Status/code is enough to diagnose from here.
        hasResponse: !!(err as { response?: unknown })?.response,
      });
      setFormError(getErrorMessage(err));
    }
  };

  // One message under the group: a field's own validation error first, else
  // the failed-sign-in message from the server.
  const message = errors.identifier?.message ?? errors.password?.message ?? formError;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LargeTitleHeader title="Welcome back" />

          <View style={styles.form}>
            <GroupedList footer={message} footerTone="danger">
              <Controller
                control={control}
                name="identifier"
                render={({ field, fieldState }) => (
                  <InputField
                    variant="grouped"
                    label="Email or mobile number"
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!fieldState.error}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <InputField
                    ref={passwordRef}
                    variant="grouped"
                    label="Password"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    // A rejected sign-in marks the password row too, not just validation errors.
                    invalid={!!fieldState.error || !!formError}
                  />
                )}
              />
            </GroupedList>

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Forgot password" hitSlop={8} style={styles.forgotLink}>
                <Text style={styles.forgotLabel} maxFontSizeMultiplier={1.2}>
                  Forgot password?
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>

        {/* Pinned to the bottom: the primary action, then the two ways to get an account. */}
        <View style={styles.bottomBar}>
          <Button label="Sign in" variant="primary" fullWidth onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
          {!keyboardVisible && (
            <>
              <Button
                label="Create a dealer account"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/(auth)/register')}
              />
              <Button
                label="Apply on website"
                variant="link"
                onPress={() => Linking.openURL(DEALER_APPLICATION_URL)}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  // 80pt of air above the title; LargeTitleHeader brings its own 20pt side padding.
  content: { paddingTop: 80, paddingBottom: space.xxl, gap: space.x3 },
  form: { paddingHorizontal: screenPaddingX, gap: space.sm },
  forgotLink: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  forgotLabel: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.link },
  bottomBar: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: space.sm, gap: space.sm, alignItems: 'center' },
});
