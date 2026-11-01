import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import type { DealerRegisterPayload } from '@/api/types';
import { registerSchema, type RegisterFormValues } from '@/auth/validation';
import { citiesForState, INDIAN_STATES } from '@/constants/indianLocations';
import { Button, LargeTitleHeader, ListRow, Reveal, useLargeTitleScroll } from '@/src/components/ui';
import { ACTION_NAV_HEIGHT, ActionNavBar } from '@/src/components/ui/ActionNavBar';
import { FormRow, FormSection } from '@/src/components/ui/GroupedForm';
import { PickerSheet } from '@/src/components/ui/PickerSheet';
import { alpha, colors, font, motion, radii, screenPaddingX, sectionGap, space, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';
import { logger } from '@/utils/logger';

// Lets a closing sheet finish before the next modal (or the keyboard) takes over.
const SETTLE_MS = motion.duration.base + 60;
const MOBILE_LENGTH = 10;
const PINCODE_LENGTH = 6;
const CHECK_DISC = 96;

type Picker = 'state' | 'city' | null;

// POST /dealer/register (docs/api.md §3) creates a role: DEALER user with a
// linked Dealer record at status: PENDING — there is no accessToken in the
// response and the account cannot sign in until an admin approves it (see
// auth/access.ts#canAccessDealerApp). So a successful submit here ends on a
// confirmation state, never an auto-login.
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { scrollY, onScroll } = useLargeTitleScroll();

  const ownerNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const companyAddressRef = useRef<TextInput>(null);
  const gstRef = useRef<TextInput>(null);
  const panRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { isSubmitting, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Submit stays disabled until the whole form validates, so errors have to
    // surface as the user leaves each field rather than on a submit attempt.
    mode: 'onTouched',
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

  const state = watch('state');
  const city = watch('city');

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    []
  );

  // The submit button lives in the nav bar and the error would sit off-screen
  // at the bottom, so bring the user back to the message.
  useEffect(() => {
    if (!formError) return;
    HapticService.error();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [formError, scrollRef]);

  useEffect(() => {
    if (submittedEmail) HapticService.success();
  }, [submittedEmail]);

  const later = (fn: () => void) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(fn, SETTLE_MS);
  };

  const openPicker = (which: Exclude<Picker, null>) => {
    Keyboard.dismiss();
    setPicker(which);
  };

  const chooseState = (next: string) => {
    if (next !== state) setValue('city', '', { shouldValidate: true });
    setValue('state', next, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    // The city list depends on the state, so carry straight on to it.
    if (next !== state || !city) later(() => setPicker('city'));
  };

  const chooseCity = (next: string) => {
    setValue('city', next, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    later(() => companyAddressRef.current?.focus());
  };

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
    return <SubmittedScreen email={submittedEmail} />;
  }

  const submit = handleSubmit(onSubmit);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + ACTION_NAV_HEIGHT, paddingBottom: insets.bottom + space.x4 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <LargeTitleHeader title="Become a Dealer" subtitle="Create your account to start ordering" scrollY={scrollY} />

          <View style={styles.form}>
            {!!formError && (
              <View style={styles.banner} accessibilityRole="alert">
                <Text style={styles.bannerText} maxFontSizeMultiplier={1.2}>
                  {formError}
                </Text>
              </View>
            )}

            <FormSection header="Business">
              <Controller
                control={control}
                name="companyName"
                render={({ field, fieldState }) => (
                  <FormRow
                    label="Company name"
                    placeholder="Required"
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
                  <FormRow
                    ref={ownerNameRef}
                    label="Owner name"
                    placeholder="Required"
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
                  <FormRow
                    ref={phoneRef}
                    label="Mobile"
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    maxLength={MOBILE_LENGTH}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    value={field.value}
                    // iOS number pads have no Next key, so move on once the number is complete.
                    onChangeText={(text) => {
                      field.onChange(text);
                      if (text.length === MOBILE_LENGTH) emailRef.current?.focus();
                    }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormRow
                    ref={emailRef}
                    label="Email"
                    placeholder="Required"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => openPicker('state')}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <ListRow
                label="State"
                value={state || 'Select'}
                chevron
                onPress={() => openPicker('state')}
                accessibilityLabel={`State, ${state || 'not selected'}`}
              />
              <ListRow
                label="City"
                value={city || 'Select'}
                chevron
                // A city list needs a state first, so a bare City tap starts at State.
                onPress={() => openPicker(state ? 'city' : 'state')}
                accessibilityLabel={`City, ${city || 'not selected'}`}
              />
            </FormSection>

            <FormSection header="Address (optional)">
              <Controller
                control={control}
                name="companyAddress"
                render={({ field, fieldState }) => (
                  <FormRow
                    ref={companyAddressRef}
                    label="Address"
                    placeholder="Optional"
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
                  <FormRow
                    ref={pincodeRef}
                    label="Pincode"
                    placeholder="Optional"
                    keyboardType="number-pad"
                    returnKeyType="next"
                    maxLength={PINCODE_LENGTH}
                    onSubmitEditing={() => gstRef.current?.focus()}
                    value={field.value}
                    onChangeText={(text) => {
                      field.onChange(text);
                      if (text.length === PINCODE_LENGTH) gstRef.current?.focus();
                    }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </FormSection>

            <FormSection header="Tax details (optional)" footer="Adding GST and PAN speeds up approval.">
              <Controller
                control={control}
                name="gstNumber"
                render={({ field, fieldState }) => (
                  <FormRow
                    ref={gstRef}
                    label="GST"
                    placeholder="Optional"
                    autoCapitalize="characters"
                    autoCorrect={false}
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
                  <FormRow
                    ref={panRef}
                    label="PAN"
                    placeholder="Optional"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </FormSection>

            <FormSection header="Security" footer="Use at least 8 characters.">
              <Controller
                control={control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormRow
                    ref={passwordRef}
                    label="Password"
                    placeholder="Required"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    value={field.value}
                    onChangeText={(text) => {
                      field.onChange(text);
                      // The match rule hangs off the confirm field; re-check it when this one changes.
                      if (getValues('confirmPassword')) trigger('confirmPassword');
                    }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <FormRow
                    ref={confirmPasswordRef}
                    label="Confirm password"
                    placeholder="Required"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </FormSection>

            {/* iOS submits from the nav bar; Android also gets a thumb-reachable button here. */}
            {Platform.OS !== 'ios' && (
              <Button label="Submit" variant="primary" fullWidth onPress={submit} disabled={!isValid} loading={isSubmitting} />
            )}

            <Text style={styles.note} maxFontSizeMultiplier={1.2}>
              Your account needs admin approval before you can place orders. We&apos;ll email you once it&apos;s active.
            </Text>

            <View style={styles.signIn}>
              <Text style={styles.note} maxFontSizeMultiplier={1.2}>
                Already have a dealer account?
              </Text>
              <Button label="Sign in" variant="link" hideChevron onPress={() => router.replace('/(auth)/login')} />
            </View>
          </View>
        </Animated.ScrollView>

        <ActionNavBar
          title="Become a Dealer"
          onBack={() => router.back()}
          scrollY={scrollY}
          action={{
            label: 'Submit',
            accessibilityLabel: 'Submit application',
            onPress: submit,
            disabled: !isValid,
            loading: isSubmitting,
          }}
        />
      </KeyboardAvoidingView>

      <PickerSheet
        visible={picker === 'state'}
        onClose={() => setPicker(null)}
        title="State"
        searchPlaceholder="Search states"
        options={INDIAN_STATES}
        value={state}
        onSelect={chooseState}
      />
      <PickerSheet
        visible={picker === 'city'}
        onClose={() => setPicker(null)}
        title={state ? `City in ${state}` : 'City'}
        searchPlaceholder="Search or type a city"
        options={citiesForState(state)}
        value={city}
        allowCustom
        emptyHint="Type your city above to add it."
        onSelect={chooseCity}
      />
    </View>
  );
}

function SubmittedScreen({ email }: { email: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space.lg) }]}>
      <View style={styles.successContent}>
        <Reveal>
          <View style={styles.successStack}>
            <View style={styles.checkDisc} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Feather name="check" size={CHECK_DISC / 2} color={colors.white} />
            </View>
            <Text accessibilityRole="header" aria-level={1} style={styles.successTitle} maxFontSizeMultiplier={1.2}>
              Application Submitted
            </Text>
            <Text style={styles.successBody} maxFontSizeMultiplier={1.2}>
              {'Your account is pending admin approval. We’ve received your application for '}
              <Text style={styles.successEmail}>{email}</Text>
              {' and will review it within 1–2 business days. You can sign in as soon as it’s approved.'}
            </Text>
          </View>
        </Reveal>
      </View>
      <View style={styles.successBar}>
        <Button label="Back to Sign In" variant="primary" fullWidth onPress={() => router.replace('/(auth)/login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { gap: sectionGap },
  form: { paddingHorizontal: screenPaddingX, gap: sectionGap },
  banner: { padding: space.md, borderRadius: radii.input, backgroundColor: colors.redSoft },
  bannerText: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.red },
  note: { ...textStyles.callout, textAlign: 'center' },
  signIn: { alignItems: 'center', marginTop: -space.sm },
  successContent: { flex: 1, justifyContent: 'center', paddingHorizontal: screenPaddingX },
  successStack: { alignItems: 'center', gap: space.xxl },
  checkDisc: {
    width: CHECK_DISC,
    height: CHECK_DISC,
    borderRadius: CHECK_DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    // Soft accent halo, same 25% tint as the focus ring.
    boxShadow: `0 0 0 12px ${alpha(colors.accent, 0.12)}`,
  },
  successTitle: { ...textStyles.title, textAlign: 'center' },
  successBody: { ...textStyles.body, textAlign: 'center', color: colors.ink2 },
  successEmail: { ...font(600), color: colors.ink },
  successBar: { paddingHorizontal: screenPaddingX },
});
