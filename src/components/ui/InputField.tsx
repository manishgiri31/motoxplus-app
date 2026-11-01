import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, font, radii } from '@/src/theme';

export interface InputFieldProps extends TextInputProps {
  label?: string;
  /** Message shown under a boxed field. Also puts the field in the error state. */
  error?: string;
  helperText?: string;
  /** Error state without a message, for when the parent prints the message (grouped lists). */
  invalid?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  /**
   * boxed    standalone field: label above, 12pt-radius box with a 1px border.
   * grouped  a row inside a GroupedList (iOS Settings style): no box of its own,
   *          a small label above the value, the list draws the separators.
   */
  variant?: 'boxed' | 'grouped';
}

// forwardRef + plain TextInput props so this drops straight into React Hook
// Form's <Controller render={({ field }) => <InputField {...field} />} /> pattern.
export const InputField = forwardRef<TextInput, InputFieldProps>(function InputField(
  { label, error, helperText, invalid, leftElement, rightElement, variant = 'boxed', onFocus, onBlur, style, ...rest },
  ref
) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);
  const [focused, setFocused] = useState(false);
  const hasError = !!error || !!invalid;

  const input = (
    <TextInput
      ref={inputRef}
      placeholderTextColor={colors.ink3}
      selectionColor={colors.accent}
      maxLength={500}
      accessibilityLabel={label}
      maxFontSizeMultiplier={1.2}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.input, style]}
      {...rest}
    />
  );

  if (variant === 'grouped') {
    return (
      <Pressable onPress={() => inputRef.current?.focus()} accessible={false} style={styles.groupedRow}>
        {!!label && (
          <Text style={styles.groupedLabel} maxFontSizeMultiplier={1.2}>
            {label}
          </Text>
        )}
        <View style={styles.groupedInputRow}>
          {leftElement}
          {input}
          {rightElement}
        </View>
        {/* Focus / error outline drawn over the row, inside the group's clipped corners. */}
        {(focused || hasError) && (
          <View
            pointerEvents="none"
            style={[styles.groupedOutline, { borderColor: hasError ? colors.red : colors.accent }]}
          />
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.field}>
      {!!label && (
        <Text style={styles.label} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.box,
          { borderColor: hasError ? colors.red : focused ? colors.accent : colors.line },
          // 4px accent @ 25% ring (box-shadow: iOS, Android and web).
          focused && !hasError && { boxShadow: `0 0 0 4px ${colors.focusRing}` },
        ]}
      >
        {leftElement}
        {input}
        {rightElement}
      </View>
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {error}
        </Text>
      )}
      {!error && !!helperText && (
        <Text style={styles.helper} maxFontSizeMultiplier={1.2}>
          {helperText}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: radii.input,
    borderWidth: 1,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    ...font(400),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: colors.ink,
    paddingVertical: 12,
  },
  error: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.red },
  helper: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink3 },

  groupedRow: { minHeight: 64, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  groupedLabel: { ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink2 },
  groupedInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupedOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: radii.input,
    margin: 1,
  },
});
