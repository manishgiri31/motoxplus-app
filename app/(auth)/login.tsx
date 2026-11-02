import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, TextInput, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import type { ApiErrorBody } from '@/api/types';
import { DealerAccessDeniedError } from '@/auth/access';
import { useAuth } from '@/auth/useAuth';
import { AuthAlert, AuthDivider, AuthField, AuthFooter, AuthHeading, AuthScreen, authStyles, LinkText, PasswordField } from '@/src/components/auth/AuthUI';
import { AuthOtpStep } from '@/src/components/auth/AuthOtpStep';
import { CountdownTimer } from '@/src/components/auth/CountdownTimer';
import { Button } from '@/src/components/ui';
import { colors, font, space } from '@/src/theme';
import { logger } from '@/utils/logger';
import { runConnectivityDiagnostics } from '@/utils/networkDiagnostics';
import { normalizeIndianMobile } from '@/utils/phone';

type Step = 'credentials' | 'otp';
type IdentifierKind = 'email' | 'mobile';
interface Identifier {
  kind: IdentifierKind;
  value: string;
}

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 1)}${'*'.repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

function maskMobile(mobile: string) {
  return `+91 ••••• ••${mobile.slice(-2)}`;
}

// Resolves what was typed into the one identifier box. Null for anything that
// is neither an Indian mobile number nor shaped like an email.
function resolveIdentifier(raw: string): Identifier | null {
  const mobile = normalizeIndianMobile(raw);
  if (mobile) return { kind: 'mobile', value: mobile };
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { kind: 'email', value: email } : null;
}

function otpBody(r: Identifier) {
  return r.kind === 'mobile' ? ({ method: 'mobile', mobile: r.value } as const) : ({ method: 'email', email: r.value } as const);
}

// Sign in, laid out exactly like the website's sign-in: one screen with
// identifier + password, and a one-time code as the alternative (a second
// step that auto-submits on the sixth digit). The website's "Customer" tab is
// not here: this app is for approved dealers only (auth/access.ts).
export default function LoginScreen() {
  const { login, loginWithOtp, accessDenied } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [step, setStep] = useState<Step>('credentials');
  const [identifierInput, setIdentifierInput] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [resolved, setResolved] = useState<Identifier | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [otp, setOtp] = useState('');
  const [timerKey, setTimerKey] = useState(0);

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  // Set only for a 429/423 password response: drives the countdown and the
  // "reset your password" prompt instead of the plain error banner.
  const [lockout, setLockout] = useState<{ message: string; retryAfterSeconds: number } | null>(null);

  // AuthProvider sets accessDenied both from a failed login attempt and from
  // a rejected cold-start session restore: this is the single place that
  // reacts to it, so both cases land on the same Access Denied screen.
  useEffect(() => {
    if (accessDenied) router.replace('/(auth)/access-denied');
  }, [accessDenied]);

  const goTo = (next: Step) => {
    setStep(next);
    setError('');
    setLockout(null);
    setStatus('idle');
  };

  // Keep Android's hardware back inside the flow: from the code step it
  // returns to the password form instead of leaving the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step !== 'otp') return false;
      goTo('credentials');
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const resolveOrFlag = (): Identifier | null => {
    const r = resolveIdentifier(identifierInput);
    if (!r) {
      setIdentifierError('Enter a valid email address or 10-digit mobile number');
      return null;
    }
    setIdentifierError('');
    setResolved(r);
    return r;
  };

  const requestOtp = async (r: Identifier): Promise<boolean> => {
    setStatus('loading');
    setError('');
    try {
      await authService.sendLoginOtp(otpBody(r));
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't send the code. Please try again."));
      setStatus('error');
      return false;
    }
    setStatus('idle');
    return true;
  };

  const handleSendCode = async () => {
    const r = resolveOrFlag();
    if (!r) return;
    if (await requestOtp(r)) {
      setOtp('');
      setTimerKey((k) => k + 1);
      goTo('otp');
    }
  };

  const handleResend = async () => {
    if (!resolved || !(await requestOtp(resolved))) throw new Error('Resend failed');
  };

  const handlePasswordLogin = async () => {
    if (status === 'loading') return;
    const r = resolveOrFlag();
    if (!password) setPasswordError('Enter your password');
    if (!r || !password) return;

    setStatus('loading');
    setError('');
    setLockout(null);

    try {
      // Dev-only pre-flight so a dead connection is caught and fully logged
      // before it gets conflated with an auth failure. No-op in production
      // builds (see utils/networkDiagnostics.ts).
      if (__DEV__) {
        const reachable = await runConnectivityDiagnostics();
        if (!reachable) {
          setError('Could not reach motoxplus.com at all (see Metro logs for diagnostics).');
          setStatus('error');
          return;
        }
      }
      await login(r.kind === 'mobile' ? { mobile: r.value, password } : { email: r.value, password });
      setStatus('idle');
    } catch (err) {
      // The accessDenied effect above is about to replace this screen with the
      // dedicated Access Denied screen, so no inline error here.
      if (err instanceof DealerAccessDeniedError) {
        setStatus('idle');
        return;
      }
      logger.error('Login failed', {
        // Never log the password. Status/code is enough to diagnose from here.
        hasResponse: !!(err as { response?: unknown })?.response,
      });

      const res = isAxiosError<ApiErrorBody & { retryAfterSeconds?: number }>(err) ? err.response : undefined;
      if (res && (res.status === 429 || res.status === 423)) {
        const headerSeconds = Number(res.headers?.['retry-after']);
        const retryAfterSeconds = Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : (res.data?.retryAfterSeconds ?? 60);
        setLockout({ message: res.data?.error || 'Too many attempts.', retryAfterSeconds });
        setPassword('');
      } else if (res && (res.status === 401 || res.status === 400 || res.status === 403)) {
        setError(res.data?.error || 'Incorrect email/mobile or password.');
      } else {
        setError(getErrorMessage(err));
      }
      setStatus('error');
    }
  };

  const verifyOtp = async (code: string) => {
    if (!resolved) return;
    setStatus('loading');
    setError('');
    try {
      await loginWithOtp({ ...otpBody(resolved), otp: code });
      setStatus('idle');
    } catch (err) {
      setOtp('');
      if (err instanceof DealerAccessDeniedError) {
        setStatus('idle');
        return;
      }
      setError(getErrorMessage(err, 'Invalid or expired code'));
      setStatus('error');
    }
  };

  // Auto-submit once all 6 digits are entered: no separate "Verify" tap needed.
  useEffect(() => {
    if (otp.length === 6 && status !== 'loading') verifyOtp(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  if (step === 'otp' && resolved) {
    return (
      <AuthScreen>
        <AuthOtpStep
          destination={resolved.kind === 'mobile' ? maskMobile(resolved.value) : maskEmail(resolved.value)}
          channel={resolved.kind === 'mobile' ? 'WhatsApp' : 'email'}
          otp={otp}
          onOtpChange={(v) => {
            setOtp(v);
            if (error) setError('');
          }}
          status={status}
          error={error}
          timerKey={timerKey}
          onResend={handleResend}
          onBack={() => goTo('credentials')}
          backLabel="Use password instead"
        />
      </AuthScreen>
    );
  }

  const busy = status === 'loading';
  const codeChannel = resolved?.kind === 'mobile' || normalizeIndianMobile(identifierInput) ? 'WhatsApp' : 'email';

  return (
    <AuthScreen>
      <AuthHeading title="Sign in" subtitle="For MOTOXPLUS dealers." />

      <View style={authStyles.fields}>
        <AuthField
          label="Email or mobile number"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="username"
          keyboardType="email-address"
          returnKeyType="next"
          placeholder="you@company.com or 98765 43210"
          value={identifierInput}
          error={identifierError}
          onSubmitEditing={() => passwordRef.current?.focus()}
          onChangeText={(t) => {
            setIdentifierInput(t);
            setIdentifierError('');
            setError('');
          }}
        />

        <PasswordField
          ref={passwordRef}
          label="Password"
          value={password}
          error={passwordError}
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={handlePasswordLogin}
          labelAction={<LinkText onPress={() => router.push('/(auth)/forgot-password')}>Forgot password?</LinkText>}
          onChangeText={(t) => {
            setPassword(t);
            setPasswordError('');
            if (error) setError('');
          }}
        />

        {lockout ? (
          <AuthAlert>
            <Text style={styles.alertText} maxFontSizeMultiplier={1.2}>
              {lockout.message}
            </Text>
            <View style={styles.alertGap}>
              <CountdownTimer seconds={lockout.retryAfterSeconds} label="Try again" compact onComplete={() => setLockout(null)} />
            </View>
            <View style={styles.alertGap}>
              <LinkText bold onPress={() => router.push('/(auth)/forgot-password')}>
                Reset your password instead
              </LinkText>
            </View>
          </AuthAlert>
        ) : (
          !!error && <AuthAlert>{error}</AuthAlert>
        )}

        <Button label="Sign in" variant="primary" fullWidth loading={busy} disabled={!!lockout} onPress={handlePasswordLogin} />
      </View>

      <AuthDivider />

      <Button label={`Send me a code on ${codeChannel}`} variant="neutral" fullWidth disabled={busy} onPress={handleSendCode} />
      <Text style={[authStyles.note, styles.codeNote]} maxFontSizeMultiplier={1.2}>
        No password needed. The code works once and expires in 5 minutes.
      </Text>

      <AuthFooter>
        <Text style={authStyles.muted} maxFontSizeMultiplier={1.2}>
          New to MOTOXPLUS?
        </Text>
        <LinkText bold onPress={() => router.push('/(auth)/register')}>
          Apply for a dealer account
        </LinkText>
      </AuthFooter>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  alertText: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.red },
  alertGap: { marginTop: 6 },
  codeNote: { marginTop: space.sm },
});
