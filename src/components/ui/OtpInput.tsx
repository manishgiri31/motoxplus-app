import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radii } from '@/src/theme';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

// Single hidden TextInput drives real keyboard/paste behavior; the boxes are
// a purely visual projection of its value, active box gets the red focus border.
export function OtpInput({ length = 6, value, onChange, autoFocus }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityRole="none">
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const active = focused && i === digits.length;
          return (
            <View key={i} style={[styles.box, active && styles.boxActive]}>
              <Text style={styles.digit}>{digits[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
        accessibilityLabel="One-time passcode"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  boxActive: { borderColor: colors.red, borderWidth: 2 },
  digit: { fontFamily: fonts.mono.medium, fontSize: 20, color: colors.ink },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
