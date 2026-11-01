import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radii, screenPaddingX, textStyles } from '@/src/theme';

import { Button } from '../ui/Button';

export const VEHICLE_PILL_HEIGHT = 48;
// Pill plus the 12pt gap under it, for callers that reserve the space.
export const VEHICLE_PILL_BLOCK_HEIGHT = VEHICLE_PILL_HEIGHT + 12;

export interface VehiclePillProps {
  /** "Brand Model · Variant". */
  label: string;
  onChange: () => void;
  onClear: () => void;
}

// The selected bike, as a bgAlt pill with a plain "Change" link and a small
// clear button.
export function VehiclePill({ label, onChange, onClear }: VehiclePillProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
        <Button label="Change" variant="link" onPress={onChange} accessibilityLabel="Change vehicle" style={styles.change} />
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear vehicle filter"
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <Feather name="x" size={18} color={colors.ink3} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: VEHICLE_PILL_BLOCK_HEIGHT, paddingHorizontal: screenPaddingX, paddingBottom: 12 },
  pill: {
    height: VEHICLE_PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.bgAlt,
  },
  label: { flex: 1, ...textStyles.calloutStrong },
  change: { paddingHorizontal: 4 },
  clear: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
