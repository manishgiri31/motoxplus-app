import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompactTitleBar } from '@/src/components/ui/LargeTitleHeader';
import { colors, layout, space } from '@/src/theme';

// Height of the row the back button and inline title share, under the status bar.
export const TOP_BAR_HEIGHT = 44;

export interface ScreenTopBarProps {
  title: string;
  scrollY: SharedValue<number>;
  /** Block going back, e.g. while a payment is being verified. */
  backDisabled?: boolean;
}

// The screens in this flow hide the native header so the 34pt large title can
// collapse into a 17pt inline title (CompactTitleBar). That removes the native
// back button, so this puts one back, 44pt and labelled. Render it as the last
// child of the screen so it overlays the scrolling content.
export function ScreenTopBar({ title, scrollY, backDisabled = false }: ScreenTopBarProps) {
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <>
      <CompactTitleBar title={title} scrollY={scrollY} />
      <View pointerEvents="box-none" style={[styles.backWrap, { top: insets.top }]}>
        <Pressable
          onPress={goBack}
          disabled={backDisabled}
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityState={{ disabled: backDisabled }}
          style={({ pressed }) => [styles.back, backDisabled && styles.disabled, pressed && styles.pressed]}
        >
          {/* Ink, like the back button in the native headers and on product pages. */}
          <Feather name="chevron-left" size={28} color={colors.ink} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backWrap: { position: 'absolute', left: space.sm, height: TOP_BAR_HEIGHT, justifyContent: 'center' },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.3 },
});
