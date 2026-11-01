import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, font, radii } from '@/src/theme';

import { GroupedList } from './GroupedList';

export interface FormSectionProps {
  /** Shown uppercase above the group (13pt, ink2), like iOS Settings. */
  header: string;
  /** Note under the group; pass `footerTone="danger"` for an error. */
  footer?: string | null;
  footerTone?: 'neutral' | 'danger';
  children: React.ReactNode;
}

// A titled GroupedList: the header sits outside the rounded group, 16pt in
// from the edge so it lines up with the row content.
export function FormSection({ header, footer, footerTone, children }: FormSectionProps) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionHeader} maxFontSizeMultiplier={1.2}>
        {header}
      </Text>
      <GroupedList footer={footer} footerTone={footerTone}>
        {children}
      </GroupedList>
    </View>
  );
}

export interface FormRowProps extends TextInputProps {
  label: string;
  /** Message printed under the value; also puts the row in the error state. */
  error?: string;
}

// Settings-style text row: label on the left, value right-aligned. Tapping
// anywhere on the row focuses the input. Focus draws an accent outline inside
// the group's clipped corners, an error a red one (same treatment as
// InputField's grouped variant).
export const FormRow = forwardRef<TextInput, FormRowProps>(function FormRow(
  { label, error, onFocus, onBlur, style, ...rest },
  ref
) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false} style={styles.row}>
      <View style={styles.line}>
        <Text
          style={styles.label}
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          {label}
        </Text>
        <TextInput
          ref={inputRef}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          maxLength={500}
          maxFontSizeMultiplier={1.2}
          accessibilityLabel={error ? `${label}, ${error}` : label}
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
      </View>
      {!!error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
          {error}
        </Text>
      )}
      {(focused || !!error) && (
        <View pointerEvents="none" style={[styles.outline, { borderColor: error ? colors.red : colors.accent }]} />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionHeader: {
    ...font(400),
    paddingHorizontal: 16,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  row: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 4, justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { ...font(400), flexShrink: 1, maxWidth: '50%', fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  input: {
    ...font(400),
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
    textAlign: 'right',
    fontSize: 17,
    letterSpacing: -0.34,
    color: colors.ink,
  },
  error: { ...font(400), paddingBottom: 8, textAlign: 'right', fontSize: 14, lineHeight: 20, color: colors.red },
  outline: { ...StyleSheet.absoluteFillObject, margin: 1, borderWidth: 1.5, borderRadius: radii.input },
});
