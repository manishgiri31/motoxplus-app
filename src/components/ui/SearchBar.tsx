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
}

// iOS-style search bar: a grey rounded field with a magnifier and a clear
// button. While it is focused (or holds text) a "Cancel" link slides in on the
// right; Cancel clears the text and dismisses the keyboard.
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel,
  style,
  ...inputProps
}: SearchBarProps) {
  const reduceMotion = useReduceMotion();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  const progress = useSharedValue(0);
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
      <Animated.View style={[styles.field, fieldStyle]}>
        <Search size={iconSizes.inline} color={colors.ink3} />
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
          accessibilityLabel={accessibilityLabel ?? placeholder}
          {...inputProps}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
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
            onChangeText('');
            inputRef.current?.blur();
          }}
          accessibilityRole="button"
          accessibilityLabel="Cancel search"
          accessibilityElementsHidden={!active}
          importantForAccessibility={active ? 'yes' : 'no-hide-descendants'}
          style={({ pressed }) => [styles.cancelPress, pressed && styles.pressed]}
        >
          <Text style={styles.cancelLabel} maxFontSizeMultiplier={1.2}>
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
  input: { flex: 1, height: '100%', padding: 0, ...textStyles.body },
  clear: { alignItems: 'center', justifyContent: 'center' },
  cancel: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  cancelPress: { minHeight: layout.minTouchTarget, justifyContent: 'center', paddingLeft: 12 },
  cancelLabel: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.link },
  pressed: { opacity: 0.6 },
});
