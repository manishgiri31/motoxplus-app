import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, font, layout } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

// Rows for <GroupedList> that carry a selection instead of navigating:
// CheckRow for single-choice lists (a checkmark marks the selected one) and
// SwitchRow for on/off settings. Same 52pt metrics and opacity-0.6 press
// feedback as <ListRow>.

export interface CheckRowProps {
  title: string;
  selected: boolean;
  onPress: () => void;
}

export function CheckRow({ title, selected, onPress }: CheckRowProps) {
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <View style={styles.check}>{selected && <Feather name="check" size={20} color={colors.accent} />}</View>
    </Pressable>
  );
}

export interface SwitchRowProps {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({ title, value, onValueChange }: SwitchRowProps) {
  const toggle = () => {
    HapticService.light();
    onValueChange(!value);
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      {/* The row is the control; the Switch is only its visual. */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch
          value={value}
          trackColor={{ false: colors.line, true: colors.accent }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.line}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    // Keeps the 44pt target honest even if a caller overrides minHeight.
    minWidth: layout.minTouchTarget,
  },
  title: { flex: 1, ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  check: { width: 24, alignItems: 'flex-end' },
  pressed: { opacity: 0.6 },
});
