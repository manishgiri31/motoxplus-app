import { Feather } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import type { ApiErrorBody, RegisterPayload } from '@/api/types';
import { GST_REGEX, PAN_REGEX } from '@/auth/validation';
import { evaluatePassword, PASSWORD_MAX_BYTES, passwordByteLength } from '@/auth/passwordPolicy';
import { INDIAN_STATES } from '@/constants/indianLocations';
import { webOrigin } from '@/config/env';
import {
  AuthAlert,
  AuthField,
  AuthFieldset,
  AuthFooter,
  AuthHeading,
  AuthScreen,
  authStyles,
  LinkText,
  PasswordField,
  SelectField,
  TextAction,
} from '@/src/components/auth/AuthUI';
import { CountdownTimer } from '@/src/components/auth/CountdownTimer';
import { Button } from '@/src/components/ui';
import { OtpInput } from '@/src/components/ui/OtpInput';
import { PickerSheet } from '@/src/components/ui/PickerSheet';
import { colors, font, radii, space } from '@/src/theme';
import { HapticService } from '@/utils/haptics';
import { logger } from '@/utils/logger';
import { normalizeIndianMobile } from '@/utils/phone';

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ICON_TILE = 48;
// The verification email's code stays valid longer than a sign-in code, so its
// resend countdown is the website's 10 minutes (the server caps it at 1/hour).
const EMAIL_RESEND_SECONDS = 600;

type Errors = Partial<Record<string, string>>;
type Phase = 'form' | 'check' | 'verify' | 'verified';

// Which step a server-side rejection belongs to, so a 409 "Email already
// registered" sent back from step 2's submit lands on the email field instead
// of a banner about a field the user can no longer see.
const ACCOUNT_FIELDS = new Set(['name', 'email', 'phone', 'password']);

function mapServerError(message: string): { field: string; message: string } | null {
  if (/^email|invalid email/i.test(message)) return { field: 'email', message };
  if (/mobile/i.test(message)) return { field: 'phone', message };
  if (/password/i.test(message)) return { field: 'password', message };
  if (/gst/i.test(message)) return { field: 'gstNumber', message };
  if (/pan/i.test(message)) return { field: 'panNumber', message };
  if (/aadhaar/i.test(message)) return { field: 'aadhaarNumber', message };
  if (/pincode/i.test(message)) return { field: 'pincode', message };
  return null;
}

// Dealer signup, laid out exactly like the website's: two short steps
// (account, then business) validated per step with the rules the server
// enforces, ending on "Check your email". Accounts are active as soon as the
// email is verified: there is no admin approval step.
export default function RegisterScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, TextInput | null>>({});
  const bind = (name: string) => (el: TextInput | null) => {
    fieldRefs.current[name] = el;
  };

  const [phase, setPhase] = useState<Phase>('form');
  const [step, setStep] = useState<1 | 2>(1);
  const [a, setA] = useState({ name: '', email: '', phone: '', password: '' });
  const [b, setB] = useState({
    companyName: '',
    ownerName: '',
    gstNumber: '',
    panNumber: '',
    aadhaarNumber: '',
    address: '',
    state: '',
    city: '',
    pincode: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState<{ userId: string; email: string } | null>(null);
  const [statePicker, setStatePicker] = useState(false);

  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const setField = <K extends keyof typeof a>(k: K, v: string) => {
    setA((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
    setFormError('');
  };
  const setBField = <K extends keyof typeof b>(k: K, v: string) => {
    setB((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
    setFormError('');
  };

  const focusFirstError = (errs: Errors) => {
    const first = Object.keys(errs).find((k) => errs[k]);
    if (first) requestAnimationFrame(() => fieldRefs.current[first]?.focus());
  };

  // A new step or phase starts at the top, like the website's scrollTo(0).
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, phase]);

  // Keep Android's hardware back inside the flow: it steps back through the
  // form (and the code entry) instead of leaving the screen mid-signup.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'form' && step === 2) {
        setStep(1);
        setFormError('');
        return true;
      }
      if (phase === 'verify') {
        setPhase('check');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [phase, step]);

  const validateAccount = (): Errors => {
    const e: Errors = {};
    if (a.name.trim().length < 2) e.name = 'Enter your full name';
    if (!EMAIL_REGEX.test(a.email.trim())) e.email = 'Enter a valid email address';
    if (!normalizeIndianMobile(a.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (!a.password) e.password = 'Create a password';
    else if (passwordByteLength(a.password) > PASSWORD_MAX_BYTES) e.password = `Use ${PASSWORD_MAX_BYTES} bytes or fewer`;
    else if (!evaluatePassword(a.password).meetsRules) e.password = "Password doesn't meet all the requirements below";
    return e;
  };

  const validateBusiness = (): Errors => {
    const e: Errors = {};
    if (!b.companyName.trim()) e.companyName = 'Enter your company or shop name';
    if (!b.ownerName.trim()) e.ownerName = "Enter the proprietor or director's name";
    if (b.gstNumber && !GST_REGEX.test(b.gstNumber)) e.gstNumber = 'Enter a valid 15-character GSTIN';
    if (b.panNumber && !PAN_REGEX.test(b.panNumber)) e.panNumber = 'Enter a valid PAN, e.g. ABCDE1234F';
    if (b.aadhaarNumber && b.aadhaarNumber.length !== 12) e.aadhaarNumber = 'Aadhaar is 12 digits';
    if (!b.address.trim()) e.address = 'Enter your shop or office address';
    if (!b.state) e.state = 'Select a state';
    if (!b.city.trim()) e.city = 'Enter your city';
    if (!PINCODE_REGEX.test(b.pincode)) e.pincode = 'Enter a 6-digit pincode';
    return e;
  };

  const handleStep1 = () => {
    const errs = validateAccount();
    setErrors(errs);
    if (Object.keys(errs).length) {
      HapticService.error();
      return focusFirstError(errs);
    }
    setStep(2);
  };

  const handleStep2 = async () => {
    if (busy) return;
    const errs = validateBusiness();
    setErrors(errs);
    if (Object.keys(errs).length) {
      HapticService.error();
      return focusFirstError(errs);
    }

    setBusy(true);
    setFormError('');
    try {
      // Optional fields go out only when filled: an empty string would fail
      // the server's own format validation (GST / PAN / Aadhaar).
      const payload: RegisterPayload = {
        name: a.name.trim(),
        email: a.email.trim(),
        phone: normalizeIndianMobile(a.phone) ?? a.phone,
        password: a.password,
        companyName: b.companyName.trim(),
        ownerName: b.ownerName.trim(),
        address: b.address.trim(),
        state: b.state,
        city: b.city.trim(),
        pincode: b.pincode,
        ...(b.gstNumber ? { gstNumber: b.gstNumber } : {}),
        ...(b.panNumber ? { panNumber: b.panNumber } : {}),
        ...(b.aadhaarNumber ? { aadhaarNumber: b.aadhaarNumber } : {}),
      };
      const res = await authService.register(payload);
      setCreated({ userId: res.userId, email: res.email ?? a.email });
      setPhase('check');
      HapticService.success();
    } catch (err) {
      logger.error('Dealer registration failed', {
        hasResponse: !!(err as { response?: unknown })?.response,
      });
      const res = isAxiosError<ApiErrorBody>(err) ? err.response : undefined;
      if (!res) {
        setFormError(getErrorMessage(err));
        return;
      }
      const message = res.data?.error || (res.status === 429 ? 'Too many attempts. Please try again later.' : 'Registration failed. Please try again.');
      const mapped = res.status === 429 ? null : mapServerError(message);
      if (mapped) {
        const errs2 = { [mapped.field]: mapped.message };
        setErrors(errs2);
        if (ACCOUNT_FIELDS.has(mapped.field)) setStep(1);
        focusFirstError(errs2);
      } else {
        setFormError(message);
      }
      HapticService.error();
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!created || verifying) return;
    if (otp.length !== 6) {
      setVerifyError('Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      await authService.verifyEmail({ userId: created.userId, otp });
      HapticService.success();
      setPhase('verified');
    } catch (err) {
      setVerifyError(getErrorMessage(err, 'Verification failed'));
      HapticService.error();
    } finally {
      setVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!created) return;
    try {
      await authService.sendEmailVerification({ userId: created.userId });
      setVerifyError('');
    } catch (err) {
      setVerifyError(getErrorMessage(err, 'Failed to resend'));
      throw err;
    }
  };

  const openLegal = (path: '/terms' | '/privacy') => WebBrowser.openBrowserAsync(`${webOrigin}${path}`);

  if (phase === 'check' && created) {
    return (
      <AuthScreen scrollRef={scrollRef}>
        <View style={styles.tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Feather name="mail" size={22} color={colors.success} />
        </View>
        <AuthHeading
          title="Check your email"
          subtitle={
            <>
              {'We sent a 6-digit verification code to '}
              <Text style={styles.strong}>{created.email}</Text>.
            </>
          }
        />
        <View style={styles.steps}>
          {[
            ['01', 'Enter the code to verify your email', true],
            ['02', 'Sign in, then verify your mobile number', false],
            ['03', 'Start ordering', false],
          ].map(([n, text, active]) => (
            <View key={n as string} style={styles.stepRow}>
              <Text style={styles.stepNum} maxFontSizeMultiplier={1.2}>
                {n}
              </Text>
              <Text style={[styles.stepText, !active && { color: colors.ink2 }]} maxFontSizeMultiplier={1.2}>
                {text}
              </Text>
            </View>
          ))}
        </View>
        <Button label="Enter verification code" variant="primary" fullWidth onPress={() => setPhase('verify')} />
      </AuthScreen>
    );
  }

  if (phase === 'verify' && created) {
    return (
      <AuthScreen scrollRef={scrollRef}>
        <AuthHeading
          title="Verify your email"
          subtitle={
            <>
              {'Enter the 6-digit code sent to '}
              <Text style={styles.strong}>{created.email}</Text>.
            </>
          }
        />
        <View style={authStyles.fields}>
          <OtpInput
            value={otp}
            onChange={(v) => {
              setOtp(v);
              if (verifyError) setVerifyError('');
            }}
            autoFocus
            error={!!verifyError}
          />
          {!!verifyError && <AuthAlert>{verifyError}</AuthAlert>}
          <Button label="Verify email" variant="primary" fullWidth loading={verifying} disabled={otp.length !== 6} onPress={handleVerify} />
          <CountdownTimer seconds={EMAIL_RESEND_SECONDS} onResend={handleResendEmail} label="Resend verification email" />
        </View>
        <AuthFooter>
          <TextAction label="Back to sign in" icon="arrow-left" onPress={() => router.replace('/(auth)/login')} />
        </AuthFooter>
      </AuthScreen>
    );
  }

  if (phase === 'verified') {
    return (
      <AuthScreen scrollRef={scrollRef}>
        <View style={styles.tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Feather name="check" size={22} color={colors.success} />
        </View>
        <AuthHeading
          title="Email verified"
          subtitle="Your email is verified. Sign in next. We'll ask you to verify your mobile number to finish setting up."
        />
        <Button label="Go to sign in" variant="primary" fullWidth onPress={() => router.replace('/(auth)/login')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen scrollRef={scrollRef}>
      <View style={styles.progress}>
        <Text style={styles.progressLabel} maxFontSizeMultiplier={1.2} accessibilityLabel={`Step ${step} of 2, ${step === 1 ? 'Account' : 'Business'}`}>
          {`Step ${step} of 2 / ${step === 1 ? 'Account' : 'Business'}`}
        </Text>
        <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.bar, { backgroundColor: colors.ink }]} />
          <View style={[styles.bar, { backgroundColor: step === 2 ? colors.ink : colors.line }]} />
        </View>
      </View>

      {step === 1 && (
        <View>
          <AuthHeading title="Create your dealer account" subtitle="You'll use these details to sign in. Business details come next." />
          <View style={authStyles.fields}>
            <AuthField
              ref={bind('name')}
              label="Full name"
              autoFocus
              autoComplete="name"
              autoCapitalize="words"
              maxLength={100}
              returnKeyType="next"
              placeholder="Your full name"
              value={a.name}
              error={errors.name}
              onSubmitEditing={() => fieldRefs.current.email?.focus()}
              onChangeText={(t) => setField('name', t)}
            />
            <AuthField
              ref={bind('email')}
              label="Work email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="email-address"
              maxLength={254}
              returnKeyType="next"
              placeholder="you@company.com"
              value={a.email}
              error={errors.email}
              onSubmitEditing={() => fieldRefs.current.phone?.focus()}
              onChangeText={(t) => setField('email', t)}
            />
            <AuthField
              ref={bind('phone')}
              label="Mobile number"
              prefix="+91"
              autoComplete="tel-national"
              keyboardType="phone-pad"
              returnKeyType="next"
              placeholder="98765 43210"
              hint="We'll verify this number with a one-time code."
              value={a.phone}
              error={errors.phone}
              onSubmitEditing={() => fieldRefs.current.password?.focus()}
              onChangeText={(t) => setField('phone', t)}
            />
            <PasswordField
              ref={bind('password')}
              label="Password"
              showStrength
              autoComplete="new-password"
              returnKeyType="go"
              placeholder="Create a password"
              value={a.password}
              error={errors.password}
              onSubmitEditing={handleStep1}
              onChangeText={(t) => setField('password', t)}
            />
            <Button label="Continue" variant="primary" fullWidth onPress={handleStep1} />
          </View>
        </View>
      )}

      {step === 2 && (
        <View>
          <AuthHeading title="Tell us about your business" subtitle="Used to set up your dealer pricing and GST invoices." />
          <View style={authStyles.fields}>
            <AuthField
              ref={bind('companyName')}
              label="Company or shop name"
              autoFocus
              autoComplete="organization"
              autoCapitalize="words"
              maxLength={150}
              returnKeyType="next"
              value={b.companyName}
              error={errors.companyName}
              onSubmitEditing={() => fieldRefs.current.ownerName?.focus()}
              onChangeText={(t) => setBField('companyName', t)}
            />
            <AuthField
              ref={bind('ownerName')}
              label="Proprietor / director"
              autoComplete="off"
              autoCapitalize="words"
              maxLength={100}
              returnKeyType="next"
              placeholder="Name as on business records"
              value={b.ownerName}
              error={errors.ownerName}
              onSubmitEditing={() => fieldRefs.current.gstNumber?.focus()}
              onChangeText={(t) => setBField('ownerName', t)}
            />

            <AuthFieldset legend="Tax identity" note="(optional)">
              <AuthField
                ref={bind('gstNumber')}
                label="GSTIN"
                mono
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                maxLength={15}
                returnKeyType="next"
                placeholder="22AAAAA0000A1Z5"
                value={b.gstNumber}
                error={errors.gstNumber}
                onSubmitEditing={() => fieldRefs.current.panNumber?.focus()}
                onChangeText={(t) => setBField('gstNumber', t.toUpperCase().replace(/\s/g, ''))}
              />
              <AuthField
                ref={bind('panNumber')}
                label="PAN"
                mono
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                maxLength={10}
                returnKeyType="next"
                placeholder="ABCDE1234F"
                value={b.panNumber}
                error={errors.panNumber}
                onSubmitEditing={() => fieldRefs.current.aadhaarNumber?.focus()}
                onChangeText={(t) => setBField('panNumber', t.toUpperCase().replace(/\s/g, ''))}
              />
              <AuthField
                ref={bind('aadhaarNumber')}
                label="Aadhaar"
                mono
                autoComplete="off"
                keyboardType="number-pad"
                maxLength={12}
                placeholder="12 digits"
                value={b.aadhaarNumber}
                error={errors.aadhaarNumber}
                onChangeText={(t) => setBField('aadhaarNumber', t.replace(/\D/g, ''))}
              />
              <Text style={authStyles.note} maxFontSizeMultiplier={1.2}>
                Aadhaar is encrypted before it is stored.
              </Text>
            </AuthFieldset>

            <AuthField
              ref={bind('address')}
              label="Shop / office address"
              autoComplete="street-address"
              maxLength={300}
              returnKeyType="next"
              value={b.address}
              error={errors.address}
              onSubmitEditing={() => setStatePicker(true)}
              onChangeText={(t) => setBField('address', t)}
            />
            <SelectField label="State" placeholder="Select state" value={b.state} error={errors.state} onPress={() => setStatePicker(true)} />
            <AuthField
              ref={bind('city')}
              label="City"
              autoComplete="postal-address-locality"
              maxLength={80}
              returnKeyType="next"
              value={b.city}
              error={errors.city}
              onSubmitEditing={() => fieldRefs.current.pincode?.focus()}
              onChangeText={(t) => setBField('city', t)}
            />
            <AuthField
              ref={bind('pincode')}
              label="Pincode"
              mono
              autoComplete="postal-code"
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="go"
              placeholder="6 digits"
              value={b.pincode}
              error={errors.pincode}
              onSubmitEditing={handleStep2}
              onChangeText={(t) => setBField('pincode', t.replace(/\D/g, ''))}
            />

            {!!formError && <AuthAlert>{formError}</AuthAlert>}

            <Button label="Create account" variant="primary" fullWidth loading={busy} onPress={handleStep2} />
            <Text style={authStyles.note} maxFontSizeMultiplier={1.2}>
              {'By creating an account you agree to our '}
              <Text style={styles.legalLink} accessibilityRole="link" onPress={() => openLegal('/terms')}>
                Terms
              </Text>
              {' and '}
              <Text style={styles.legalLink} accessibilityRole="link" onPress={() => openLegal('/privacy')}>
                Privacy Policy
              </Text>
              .
            </Text>
            <TextAction
              label="Back to account details"
              icon="arrow-left"
              onPress={() => {
                setStep(1);
                setFormError('');
              }}
            />
          </View>
        </View>
      )}

      <AuthFooter>
        <Text style={authStyles.muted} maxFontSizeMultiplier={1.2}>
          Already registered?
        </Text>
        <LinkText bold onPress={() => router.replace('/(auth)/login')}>
          Sign in
        </LinkText>
      </AuthFooter>

      <PickerSheet
        visible={statePicker}
        onClose={() => setStatePicker(false)}
        title="State"
        searchPlaceholder="Search states"
        options={INDIAN_STATES}
        value={b.state}
        onSelect={(next) => {
          setBField('state', next);
          setStatePicker(false);
        }}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  progress: { marginBottom: space.x3 },
  progressLabel: {
    ...font(400),
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
    color: colors.ink2,
  },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 2, borderRadius: radii.pill },

  tile: {
    width: ICON_TILE,
    height: ICON_TILE,
    marginBottom: space.xxl,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
  strong: { ...font(600), color: colors.ink },
  steps: { marginBottom: space.x3, paddingTop: space.xl, gap: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  stepRow: { flexDirection: 'row', gap: space.md },
  stepNum: { ...font(400), width: 20, paddingTop: 2, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'], color: colors.ink2 },
  stepText: { ...font(400), flex: 1, fontSize: 15, lineHeight: 22, color: colors.ink },
  legalLink: { textDecorationLine: 'underline' },
});
