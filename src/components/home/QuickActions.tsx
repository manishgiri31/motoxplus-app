import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FileText } from '@/components/icons/FileText';
import { Headset } from '@/components/icons/Headset';
import { MapPin } from '@/components/icons/MapPin';
import { Search } from '@/components/icons/Search';
import { iconSizes } from '@/components/icons/iconSizes';
import type { IconProps } from '@/components/icons/types';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { colors, screenPaddingX, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface QuickActionsProps {
  onSearch: () => void;
  onTrack: () => void;
  onInvoices: () => void;
  onSupport: () => void;
}

interface ActionProps {
  icon: ComponentType<IconProps>;
  label: string;
  onPress: () => void;
}

const CIRCLE = 56;

function Action({ icon: ActionIcon, label, onPress }: ActionProps) {
  const focusRing = useFocusRing();
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.action}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.circle, pressed && styles.pressed, focusRing.ringStyle]}>
            <ActionIcon size={iconSizes.inList + 2} color={colors.ink} />
          </View>
          <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Four equal round buttons: 56pt bgAlt circle with an ink icon, 12pt label below.
export function QuickActions({ onSearch, onTrack, onInvoices, onSupport }: QuickActionsProps) {
  return (
    <View style={styles.row}>
      <Action icon={Search} label="Search" onPress={onSearch} />
      <Action icon={MapPin} label="Track" onPress={onTrack} />
      <Action icon={FileText} label="Invoices" onPress={onInvoices} />
      <Action icon={Headset} label="Support" onPress={onSupport} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: screenPaddingX },
  action: { flex: 1, alignItems: 'center', gap: 8, minHeight: 44 },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  label: { ...textStyles.caption, color: colors.ink },
});
