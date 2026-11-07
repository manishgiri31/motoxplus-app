import { Pressable, StyleSheet, Text } from 'react-native';

import { Search } from '@/components/icons/Search';
import { iconSizes } from '@/components/icons/iconSizes';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { colors, layout, radii, screenPaddingX, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export const SEARCH_PLACEHOLDER = 'Search parts or part number';

// Tap target that opens the Search screen. Drawn exactly like SearchBar at rest
// (same height, corner radius, grey and icon), so tapping it reads as focusing
// the same field rather than jumping to a different control.
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
      accessibilityLabel={SEARCH_PLACEHOLDER}
      accessibilityHint="Opens search"
      style={({ pressed }) => [styles.field, pressed && styles.pressed, focusRing.ringStyle]}
    >
      <Search size={iconSizes.inline} color={colors.ink3} />
      <Text style={styles.placeholder} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {SEARCH_PLACEHOLDER}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    height: layout.minTouchTarget,
    marginHorizontal: screenPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radii.input,
    backgroundColor: colors.lineSoft,
  },
  pressed: { opacity: 0.6 },
  placeholder: { flex: 1, ...textStyles.body, color: colors.ink3 },
});
