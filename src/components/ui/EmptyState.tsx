import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, font } from '@/src/theme';

import { Button, type ButtonVariant } from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Feather>['name'];
  /** A ready-made icon (e.g. a components/icons glyph); takes the place of `icon`. */
  iconElement?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Overrides the default full-height centered layout, e.g. `{ flex: 0 }` inside a scroll view. */
  style?: StyleProp<ViewStyle>;
  /** Defaults to the filled blue pill; pass 'secondary' for the outline pill. */
  actionVariant?: ButtonVariant;
}

// 48pt icon in ink3, one 17pt line, optionally one primary button.
export function EmptyState({ icon, iconElement, title, message, actionLabel, onAction, style, actionVariant = 'primary' }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {iconElement ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {iconElement}
        </View>
      ) : (
        icon && <Feather name={icon} size={48} color={colors.ink3} accessibilityElementsHidden importantForAccessibility="no" />
      )}
      <Text style={styles.title} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      {message && (
        <Text style={styles.message} maxFontSizeMultiplier={1.2}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && <Button label={actionLabel} variant={actionVariant} onPress={onAction} style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  title: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink, textAlign: 'center' },
  message: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center' },
  action: { marginTop: 8 },
});
