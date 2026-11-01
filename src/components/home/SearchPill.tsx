import { Pressable, StyleSheet, Text } from 'react-native';

import { Search } from '@/components/icons/Search';
import { iconSizes } from '@/components/icons/iconSizes';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { colors, radii, screenPaddingX, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

// Fake search field: a bgAlt pill that opens the Search sheet when tapped.
export function SearchPill({ onPress }: { onPress: () => void }) {
  const focusRing = useFocusRing();
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      accessibilityRole="search"
      accessibilityLabel="Search parts or part number"
      accessibilityHint="Opens search"
      style={({ pressed }) => [styles.pill, pressed && styles.pressed, focusRing.ringStyle]}
    >
      <Search size={iconSizes.inline} color={colors.ink3} />
      <Text style={styles.placeholder} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        Search parts or part number
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 48,
    marginHorizontal: screenPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.bgAlt,
  },
  pressed: { opacity: 0.6 },
  placeholder: { flex: 1, ...textStyles.body, color: colors.ink3 },
});
