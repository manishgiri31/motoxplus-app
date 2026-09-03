import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import type { DealerRegisterPayload } from '@/api/types';
import { registerSchema, type RegisterFormValues } from '@/auth/validation';
import { Input } from '@/components/ui';
import { Button, Eyebrow } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';
import { logger } from '@/utils/logger';

// POST /dealer/register (docs/api.md §3) creates a role: DEALER user with a
// linked Dealer record at status: PENDING — there is no accessToken in the
// response and the account cannot sign in until an admin approves it (see
// auth/access.ts#canAccessDealerApp). So a successful submit here ends on a
// confirmation state, never an auto-login.
export default function RegisterScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const ownerNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const companyAddressRef = useRef<TextInput>(null);
  const gstRef = useRef<TextInput>(null);
  const panRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
      confirmPassword: '',
      state: '',
      city: '',
      gstNumber: '',
      panNumber: '',
      companyAddress: '',
      pincode: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    if (isSubmitting) return;
    setFormError(null);
    try {
      // Optional fields go out only when filled — an empty string would fail
      // the backend's own format validation (GST/PAN regex, 6-digit pincode).
      const payload: DealerRegisterPayload = {
        companyName: values.companyName.trim(),
        ownerName: values.ownerName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        password: values.password,
        state: values.state.trim(),
        city: values.city.trim(),
        ...(values.gstNumber ? { gstNumber: values.gstNumber } : {}),
        ...(values.panNumber ? { panNumber: values.panNumber } : {}),
        ...(values.companyAddress ? { companyAddress: values.companyAddress.trim() } : {}),
        ...(values.pincode ? { pincode: values.pincode.trim() } : {}),
      };
      const res = await authService.register(payload);
      setSubmittedEmail(res.email);
    } catch (err) {
      logger.error('Dealer registration failed', {
        hasResponse: !!(err as { response?: unknown })?.response,
      });
      setFormError(getErrorMessage(err));
    }
  };

  if (submittedEmail) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.successContent}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={28} color={colors.red} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Application Submitted
          </Text>
          <Text style={styles.message}>
            {"We've received your dealer application for "}
            <Text style={styles.messageStrong}>{submittedEmail}</Text>
            {'.'}
          </Text>
          <Text style={styles.detail}>
            Our team will review your details and approve your account, usually within 1-2 business
            days. You can sign in as soon as it&apos;s approved.
          </Text>
          <Button
            label="Back to Sign In"
            variant="brand"
            fullWidth
            onPress={() => router.replace('/(auth)/login')}
            style={styles.successButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Eyebrow>MotoXPlus Dealer</Eyebrow>
            <Text style={styles.title}>Become a Dealer</Text>
            <Text style={styles.subtitle}>Create your account to start ordering</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Business details</Text>
            <Controller
              control={control}
              name="companyName"
              render={({ field, fieldState }) => (
                <Input
                  label="Company name"
                  autoFocus
                  autoCapitalize="words"
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
                  autoCapitalize="words"
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
                  returnKeyType="next"
                  maxLength={10}
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
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => stateRef.current?.focus()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Text style={styles.sectionLabel}>Location</Text>
            <View style={styles.row}>
              <View style={styles.rowField}>
                <Controller
                  control={control}
                  name="state"
                  render={({ field, fieldState }) => (
                    <Input
                      ref={stateRef}
                      label="State"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => cityRef.current?.focus()}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
              <View style={styles.rowField}>
                <Controller
                  control={control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <Input
                      ref={cityRef}
                      label="City"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => companyAddressRef.current?.focus()}
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
              name="companyAddress"
              render={({ field, fieldState }) => (
                <Input
                  ref={companyAddressRef}
                  label="Company address (optional)"
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
                  returnKeyType="next"
                  maxLength={6}
                  onSubmitEditing={() => gstRef.current?.focus()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Text style={styles.sectionLabel}>Tax details (optional, speeds up approval)</Text>
            <Controller
              control={control}
              name="gstNumber"
              render={({ field, fieldState }) => (
                <Input
                  ref={gstRef}
                  label="GST number (optional)"
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
                  label="PAN number (optional)"
                  autoCapitalize="characters"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Text style={styles.sectionLabel}>Account security</Text>
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <Input
                  ref={passwordRef}
                  label="Password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
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
              control={control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Input
                  ref={confirmPasswordRef}
                  label="Confirm password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
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

            <Button label="Create account" variant="brand" fullWidth onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
            <Text style={styles.footerNote}>
              Your account needs admin approval before you can place orders. We&apos;ll email you once
              it&apos;s active.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have a dealer account?</Text>
            <Link href="/(auth)/login" replace style={styles.signInLink}>
              <Text style={styles.signInLabel}>Sign in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  backButton: { alignSelf: 'flex-start', marginLeft: 16, marginTop: 8, padding: 4 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 32, gap: 32 },
  header: { gap: 6 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 30, lineHeight: 36, color: colors.ink },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.muted, marginTop: 4 },
  form: { gap: 16 },
  sectionLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  row: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 1 },
  error: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.red },
  footerNote: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
  footer: { alignItems: 'center', gap: 4 },
  footerText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted },
  signInLink: { paddingVertical: 4 },
  signInLabel: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.red },
  successContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  messageStrong: { fontFamily: fonts.body.semiBold, color: colors.ink },
  detail: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  successButton: { marginTop: 8, width: '100%' },
});
