import { Pressable, StyleSheet, View } from 'react-native';

import { Bell } from '@/components/icons/Bell';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { colors, layout } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface NotificationBellProps {
  onPress: () => void;
  /** Shows the unread dot. */
  unread?: boolean;
  /** Icon colour; white on the red Home header. */
  color?: string;
}

// Icon-only button: 44x44 target, labelled for VoiceOver / TalkBack.
export function NotificationBell({ onPress, unread = false, color = colors.ink }: NotificationBellProps) {
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
      accessibilityLabel={unread ? 'Notifications, unread' : 'Notifications'}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, focusRing.ringStyle]}
    >
      <Bell size={24} color={color} />
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: layout.minTouchTarget, height: layout.minTouchTarget, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  dot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.warning,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});
