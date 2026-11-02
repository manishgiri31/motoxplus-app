import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACTION_NAV_HEIGHT, ActionNavBar, type NavBarAction } from '@/src/components/ui/ActionNavBar';
import { LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { colors, screenPaddingX, space } from '@/src/theme';

export interface FormScreenProps {
  /** Inline 17pt title in the nav bar; fades in as the large title scrolls away. */
  navTitle: string;
  /** 34pt left-aligned page title. */
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** Optional trailing text action in the nav bar. */
  navAction?: NavBarAction;
  /** The screen's primary button, pinned above the keyboard / home indicator. */
  action: ReactNode;
  children: ReactNode;
}

// Layout shared by the single-purpose form screens (verify email, verify
// mobile, change email): translucent nav bar with a back chevron, a large
// title that collapses into it, the fields, and one primary button pinned to
// the bottom. It replaces the native header, which these modal routes would
// otherwise show on top of their own back arrow.
export function FormScreen({ navTitle, title, subtitle, onBack, navAction, action, children }: FormScreenProps) {
  const { scrollY, onScroll } = useLargeTitleScroll();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <LargeTitleHeader title={title} subtitle={subtitle} scrollY={scrollY} />
          <View style={styles.form}>{children}</View>
        </Animated.ScrollView>
        <View style={styles.bottomBar}>{action}</View>
      </KeyboardAvoidingView>
      <ActionNavBar title={navTitle} onBack={onBack} action={navAction} scrollY={scrollY} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  // Clears the 44pt nav bar that overlays the top of the scroll view.
  content: { paddingTop: ACTION_NAV_HEIGHT + space.xl, paddingBottom: space.xl, gap: space.xxl },
  form: { paddingHorizontal: screenPaddingX, gap: space.md },
  bottomBar: { paddingHorizontal: screenPaddingX, paddingTop: space.sm, paddingBottom: space.lg },
});
