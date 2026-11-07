import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Search } from '@/components/icons/Search';
import { iconSizes } from '@/components/icons/iconSizes';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, font, layout, motion, radii, textStyles } from '@/src/theme';

export interface SearchBarProps
  extends Pick<TextInputProps, 'autoCapitalize' | 'autoCorrect' | 'autoFocus' | 'returnKeyType' | 'onSubmitEditing'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * For a screen that is only a search (app/search.tsx): Cancel is always
   * shown and calls this instead of just clearing the field.
   */
  onCancel?: () => void;
  /** onAccent: white field and white Cancel, for the red header band. */
  tone?: 'default' | 'onAccent';
}

// iOS-style search bar: a grey rounded field with a magnifier and a clear
// button. While it is focused (or holds text) a "Cancel" link slides in on the
// right; Cancel clears the text and dismisses the keyboard. With `onCancel`,
// Cancel stays visible and leaves the screen instead.
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel,
  style,
  onCancel,
  tone = 'default',
  ...inputProps
}: SearchBarProps) {
  const onAccent = tone === 'onAccent';
  const reduceMotion = useReduceMotion();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const active = !!onCancel || focused || value.length > 0;

  // With onCancel the Cancel link is part of the layout from the first frame.
  const progress = useSharedValue(onCancel ? 1 : 0);
  const cancelWidth = useSharedValue(0);

  useEffect(() => {
    const target = active ? 1 : 0;
    progress.value = reduceMotion ? target : withTiming(target, { duration: motion.duration.fast, easing: motion.easing });
  }, [active, progress, reduceMotion]);

  const fieldStyle = useAnimatedStyle(() => ({
    marginRight: interpolate(progress.value, [0, 1], [0, cancelWidth.value]),
  }));
  const cancelStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <View style={[styles.row, style]}>
      <Animated.View style={[styles.field, onAccent && styles.fieldOnAccent, fieldStyle]}>
        <Search size={iconSizes.inline} color={onAccent ? colors.ink2 : colors.ink3} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          style={styles.input}
          maxFontSizeMultiplier={1.2}
          clearButtonMode="never"
          returnKeyType="search"
          selectionColor={colors.accent}
          accessibilityRole="search"
          accessibilityLabel={accessibilityLabel ?? placeholder}
          {...inputProps}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={{ top: 13, bottom: 13, left: 12, right: 12 }}
            style={styles.clear}
          >
            <Feather name="x-circle" size={18} color={colors.ink3} />
          </Pressable>
        )}
      </Animated.View>

      <Animated.View
        style={[styles.cancel, cancelStyle]}
        pointerEvents={active ? 'auto' : 'none'}
        onLayout={(e) => {
          cancelWidth.value = e.nativeEvent.layout.width;
        }}
      >
        <Pressable
          onPress={() => {
            if (onCancel) {
              inputRef.current?.blur();
              onCancel();
              return;
            }
            onChangeText('');
            inputRef.current?.blur();
          }}
          accessibilityRole="button"
          accessibilityLabel={onCancel ? 'Close search' : 'Cancel search'}
          accessibilityElementsHidden={!active}
          importantForAccessibility={active ? 'yes' : 'no-hide-descendants'}
          style={({ pressed }) => [styles.cancelPress, pressed && styles.pressed]}
        >
          <Text style={[styles.cancelLabel, onAccent && styles.cancelLabelOnAccent]} maxFontSizeMultiplier={1.2}>
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: layout.minTouchTarget, justifyContent: 'center' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radii.input,
    backgroundColor: colors.lineSoft,
  },
  fieldOnAccent: { backgroundColor: colors.white },
  input: { flex: 1, height: '100%', padding: 0, ...textStyles.body },
  clear: { alignItems: 'center', justifyContent: 'center' },
  cancel: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  cancelPress: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingLeft: 12 },
  cancelLabel: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.link },
  cancelLabelOnAccent: { ...font(600), color: colors.white },
  pressed: { opacity: 0.6 },
});
