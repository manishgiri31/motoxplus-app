import Feather from '@expo/vector-icons/Feather';
import { forwardRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { evaluatePassword } from '@/auth/passwordPolicy';
import { alpha, colors, font, layout, radii, screenPaddingX, space } from '@/src/theme';

/* Shared building blocks for the sign-in and sign-up screens. They mirror the
   website's components/auth/auth-ui.tsx one to one (same names, same spacing,
   same error semantics) so the two surfaces read as the same product. */

// The website crops its 1536x1024 logo to the mark's bounding box
// (685x420); assets/images/brand-mark.png is that crop, downscaled.
const MARK_ASPECT = 685 / 420;

export function BrandMark({ height = 36 }: { height?: number }) {
  return (
    <Image
      source={require('../../../assets/images/brand-mark.png')}
      accessibilityLabel="MOTOXPLUS India"
      style={{ height, width: height * MARK_ASPECT }}
      resizeMode="contain"
    />
  );
}

export interface AuthScreenProps {
  children: ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
}

// Page frame: logo header, then the form column (max 400 wide, centred on
// tablets), on the white canvas.
export function AuthScreen({ children, scrollRef }: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <BrandMark />
          </View>
          <View style={styles.column}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" aria-level={1} style={styles.headingTitle} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={styles.headingSubtitle} maxFontSizeMultiplier={1.2}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export interface AuthFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Drawn inside the input's left edge, e.g. a "+91" country code. */
  prefix?: string;
  /** Right-aligned slot in the label row (e.g. a "Forgot password?" link). */
  labelAction?: ReactNode;
  /** Monospace-style entry for GSTIN / PAN / pincode style values. */
  mono?: boolean;
  /** Trailing control inside the input (the password visibility toggle). */
  trailing?: ReactNode;
}

const PREFIX_INSET = 68;

export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, error, hint, prefix, labelAction, mono, trailing, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
        {labelAction}
      </View>
      <View
        style={[
          styles.inputBox,
          { borderColor: hasError ? colors.red : focused ? colors.accent : colors.line },
          focused && !hasError && { boxShadow: `0 0 0 3px ${colors.focusRing}` },
        ]}
      >
        {!!prefix && (
          <View style={styles.prefix} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
            <Text style={styles.prefixText} maxFontSizeMultiplier={1.2}>
              {prefix}
            </Text>
          </View>
        )}
        <TextInput
          ref={ref}
          accessibilityLabel={hasError ? `${label}, ${error}` : label}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          maxFontSizeMultiplier={1.2}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            !!prefix && { paddingLeft: PREFIX_INSET },
            !!trailing && { paddingRight: 48 },
            mono && styles.inputMono,
            style,
          ]}
          {...rest}
        />
        {trailing}
      </View>
      {hasError ? (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {error}
        </Text>
      ) : !!hint ? (
        <Text style={styles.hint} maxFontSizeMultiplier={1.2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export interface SelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onPress: () => void;
}

// The website's native <select>, as a field that opens a PickerSheet.
export function SelectField({ label, value, placeholder, error, onPress }: SelectFieldProps) {
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value || 'not selected'}${error ? `, ${error}` : ''}`}
        style={[styles.inputBox, styles.selectBox, { borderColor: error ? colors.red : colors.line }]}
      >
        <Text style={[styles.selectValue, !value && { color: colors.ink3 }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.ink2} />
      </Pressable>
      {!!error && (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {error}
        </Text>
      )}
    </View>
  );
}

// A hairline-bordered group with its legend sitting on the top edge, like the
// website's <fieldset><legend>.
export function AuthFieldset({ legend, note, children }: { legend: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.fieldset}>
      <View style={styles.legend}>
        <Text style={styles.legendText} maxFontSizeMultiplier={1.2}>
          {legend}
          {!!note && <Text style={styles.legendNote}>{` ${note}`}</Text>}
        </Text>
      </View>
      {children}
    </View>
  );
}

export interface PasswordFieldProps extends Omit<AuthFieldProps, 'trailing' | 'prefix' | 'mono' | 'secureTextEntry'> {
  value: string;
  /** Show the live strength meter and rule checklist (signup only). */
  showStrength?: boolean;
}

export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
  { value, showStrength, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <AuthField
        ref={ref}
        {...props}
        value={value}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        trailing={
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: visible }}
            hitSlop={6}
            style={styles.eye}
          >
            <Feather name={visible ? 'eye-off' : 'eye'} size={17} color={colors.ink2} />
          </Pressable>
        }
      />
      {showStrength && <PasswordStrength password={value} />}
    </View>
  );
});

const SEGMENT_TONE = [colors.line, colors.red, colors.warning, colors.success, colors.success] as const;

export function PasswordStrength({ password }: { password: string }) {
  const { rules, score, label } = evaluatePassword(password);

  return (
    <View style={styles.strength}>
      <View style={styles.strengthRow} accessible accessibilityLabel={label ? `Password strength: ${label}` : 'Password strength'} accessibilityLiveRegion="polite">
        <View style={styles.segments}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[styles.segment, { backgroundColor: n <= score ? SEGMENT_TONE[score] : colors.line }]} />
          ))}
        </View>
        <Text style={styles.strengthLabel} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      </View>
      <View style={styles.rules}>
        {rules.map((r) => (
          <View key={r.id} style={styles.rule} accessible accessibilityLabel={`${r.label}, ${r.met ? 'met' : 'not met'}`}>
            <Feather name="check" size={12} color={r.met ? colors.success : colors.ink2} style={{ opacity: r.met ? 1 : 0.3 }} />
            <Text style={[styles.ruleText, r.met && { color: colors.success }]} maxFontSizeMultiplier={1.2}>
              {r.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AuthAlert({ tone = 'danger', children, style }: { tone?: 'danger' | 'info'; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const danger = tone === 'danger';
  const fg = danger ? colors.red : colors.ink;

  return (
    <View
      accessibilityRole={danger ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[
        styles.alert,
        {
          backgroundColor: danger ? colors.redSoft : colors.card,
          borderColor: danger ? alpha(colors.red, 0.25) : colors.line,
        },
        style,
      ]}
    >
      <Feather name={danger ? 'alert-circle' : 'info'} size={16} color={fg} style={styles.alertIcon} />
      <View style={styles.alertBody}>
        {typeof children === 'string' ? (
          <Text style={[styles.alertText, { color: fg }]} maxFontSizeMultiplier={1.2}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** Quiet text-button for "back" / "use another method" style secondary actions. */
export function TextAction({
  label,
  icon,
  style,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { label: string; icon?: 'chevron-left' | 'arrow-left'; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.6 }, style]}
      {...props}
    >
      {!!icon && <Feather name={icon} size={14} color={colors.ink2} />}
      <Text style={styles.textActionLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Inline link-coloured text, e.g. the "Forgot password?" in a label row. */
export function LinkText({ children, onPress, accessibilityLabel, style, bold }: { children: string; onPress: () => void; accessibilityLabel?: string; style?: StyleProp<TextStyle>; bold?: boolean }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={accessibilityLabel ?? children} onPress={onPress} hitSlop={10}>
      <Text style={[styles.link, bold && styles.linkBold, style]} maxFontSizeMultiplier={1.2}>
        {children}
      </Text>
    </Pressable>
  );
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function Spinner({ size = 13 }: { size?: number }) {
  return <ActivityIndicator size={size > 16 ? 'large' : 'small'} color={colors.ink2} />;
}

/** The hairline-topped footer block ("New to MOTOXPLUS? ..."). */
export function AuthFooter({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export const authStyles = StyleSheet.create({
  fields: { gap: space.xl },
  muted: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  note: { ...font(400), fontSize: 13, lineHeight: 19.5, color: colors.ink2 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  pageContent: { flexGrow: 1, paddingBottom: space.x4 + space.xl },
  pageHeader: { paddingHorizontal: screenPaddingX, paddingTop: space.xl, paddingBottom: space.xl },
  column: { width: '100%', maxWidth: 400 + screenPaddingX * 2, alignSelf: 'center', paddingHorizontal: screenPaddingX },

  heading: { marginBottom: space.x3 },
  headingTitle: { ...font(600), fontSize: 28, lineHeight: 32, letterSpacing: -0.56, color: colors.ink },
  headingSubtitle: { ...font(400), marginTop: space.sm, fontSize: 15, lineHeight: 22.5, color: colors.ink2 },

  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md, marginBottom: 6 },
  label: { ...font(500), fontSize: 14, lineHeight: 20, color: colors.ink },
  inputBox: {
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  input: { ...font(400), minHeight: 46, paddingHorizontal: 16, paddingVertical: 0, fontSize: 15, color: colors.ink },
  inputMono: { letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
  prefix: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  prefixText: { ...font(400), fontSize: 15, color: colors.ink2 },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: 16 },
  selectValue: { ...font(400), flex: 1, fontSize: 15, color: colors.ink },
  fieldset: { gap: space.lg, padding: space.lg, paddingTop: space.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radii.input },
  legend: { position: 'absolute', top: -11, left: 10, paddingHorizontal: 6, backgroundColor: colors.paper },
  legendText: { ...font(500), fontSize: 14, lineHeight: 20, color: colors.ink },
  legendNote: { ...font(400), color: colors.ink2 },
  eye: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { ...font(500), marginTop: 6, fontSize: 13, lineHeight: 18, color: colors.red },
  hint: { ...font(400), marginTop: 6, fontSize: 13, lineHeight: 18, color: colors.ink2 },

  strength: { marginTop: space.md },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: radii.pill },
  strengthLabel: { ...font(500), width: 48, textAlign: 'right', fontSize: 12, lineHeight: 16, color: colors.ink2 },
  rules: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, columnGap: 16 },
  rule: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink2 },

  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: radii.input, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  alertIcon: { marginTop: 2 },
  alertBody: { flex: 1, minWidth: 0 },
  alertText: { ...font(400), fontSize: 14, lineHeight: 20 },

  textAction: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, minHeight: layout.minTouchTarget - 8, justifyContent: 'center' },
  textActionLabel: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },

  link: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.link },
  linkBold: { ...font(600) },

  divider: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginVertical: space.xxl },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  dividerLabel: { ...font(400), fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.ink2 },

  footer: {
    marginTop: space.x4,
    paddingTop: space.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 4,
  },
});
