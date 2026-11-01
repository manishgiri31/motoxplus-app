import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, screenPaddingX, space } from '@/src/theme';

export interface ResultLayoutProps {
  /** SuccessCheck, or a 48pt Feather icon in ink3 for neutral states. */
  icon: ReactNode;
  title: string;
  message?: string;
  /** Small mono-ish line under the title, e.g. the order number. */
  reference?: string;
  /** Buttons: one primary, optionally one plain link. */
  actions: ReactNode;
}

// Full-screen, centred result: icon, one title, optional message, actions at
// the bottom thumb zone.
export function ResultLayout({ icon, title, message, reference, actions }: ResultLayoutProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        {icon}
        <Text accessibilityRole="header" aria-level={1} style={styles.title} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        {!!reference && (
          <Text style={styles.reference} maxFontSizeMultiplier={1.2}>
            {reference}
          </Text>
        )}
        {!!message && (
          <Text style={styles.message} maxFontSizeMultiplier={1.2}>
            {message}
          </Text>
        )}
      </View>
      <View style={styles.actions}>{actions}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.x3, gap: space.sm },
  title: {
    ...font(600),
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
    color: colors.ink,
    textAlign: 'center',
    marginTop: space.lg,
  },
  reference: {
    ...font(400),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: colors.ink2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  message: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink2, textAlign: 'center' },
  actions: { paddingHorizontal: screenPaddingX, paddingBottom: space.lg, gap: space.sm },
});
