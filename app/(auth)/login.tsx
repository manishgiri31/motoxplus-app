import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { DEALER_APPLICATION_URL, DealerAccessDeniedError } from '@/auth/access';
import { useAuth } from '@/auth/useAuth';
import { loginSchema, type LoginFormValues } from '@/auth/validation';
import { Input } from '@/components/ui';
import { Button, Eyebrow } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { logger } from '@/utils/logger';
import { runConnectivityDiagnostics } from '@/utils/networkDiagnostics';

export default function LoginScreen() {
  const { login, accessDenied } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

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

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Eyebrow>MotoXPlus Dealer</Eyebrow>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to manage your business</Text>
          </View>

          <View style={styles.form}>
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

            {formError && <Text style={styles.error}>{formError}</Text>}

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <Text style={styles.forgotLabel}>Forgot password?</Text>
            </Link>

            <Button label="Sign in" variant="brand" fullWidth onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Need a dealer account?</Text>
            <Pressable
              onPress={() => Linking.openURL(DEALER_APPLICATION_URL)}
              hitSlop={10}
              style={styles.applyLink}
              accessibilityRole="link"
              accessibilityLabel="Apply on MotoXPlus Website"
            >
              <Text style={styles.applyLabel}>Apply on MotoXPlus Website</Text>
            </Pressable>
            <Text style={styles.footerNote}>Dealer applications are completed on the MotoXPlus website.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 },
  header: { gap: 6 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 34, lineHeight: 40, color: colors.ink },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.muted, marginTop: 4 },
  form: { gap: 16 },
  error: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.red },
  forgotLink: { alignSelf: 'flex-end' },
  forgotLabel: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.ink },
  footer: { alignItems: 'center', gap: 4 },
  footerText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  applyLink: { paddingVertical: 4 },
  applyLabel: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.red },
  footerNote: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
