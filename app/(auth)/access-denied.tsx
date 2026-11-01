import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEALER_APPLICATION_URL } from '@/auth/access';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/src/components/ui';
import { alpha, colors, screenPaddingX, space, textStyles } from '@/src/theme';

const ICON_SIZE = 64;

// Reached two ways, both driven by AuthProvider's `accessDenied` flag
// (auth/AuthProvider.tsx): a login attempt by a non-dealer/unapproved
// account, or a cold start restoring a token that no longer passes
// auth/access.ts#canAccessDealerApp (e.g. approval was revoked since the
// token was issued). The copy below is intentionally generic — it doesn't
// distinguish "wrong role" from "pending application" since we never want
// to hint at exact account state to someone who may not be its owner.
export default function AccessDeniedScreen() {
  const { clearAccessDenied } = useAuth();

  const backToSignIn = () => {
    clearAccessDenied();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Shield on a soft accent disc: the SF Symbol on iOS, a Feather
            glyph of the same shape elsewhere. Decorative, hidden from screen readers. */}
        <View style={styles.iconDisc} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Platform.OS === 'ios' ? (
            <SymbolView name="shield.fill" size={ICON_SIZE * 0.5} tintColor={colors.accent} />
          ) : (
            <Feather name="shield" size={ICON_SIZE * 0.5} color={colors.accent} />
          )}
        </View>

        <View style={styles.textBlock}>
          <Text accessibilityRole="header" aria-level={1} style={styles.title} maxFontSizeMultiplier={1.2}>
            Dealer Access Required
          </Text>
          <Text style={styles.body} maxFontSizeMultiplier={1.2}>
            This app is available only for approved MotoXPlus dealers.
          </Text>
          <Text style={styles.detail} maxFontSizeMultiplier={1.2}>
            {"If you've already applied, please wait until your application is approved.\n"}
            {"If you haven't applied yet, you can submit a dealer application on our website."}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Apply on Website" variant="primary" fullWidth onPress={() => Linking.openURL(DEALER_APPLICATION_URL)} />
          <Button label="Back to sign in" variant="link" hideChevron onPress={backToSignIn} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenPaddingX,
    gap: space.x3,
  },
  iconDisc: {
    width: ICON_SIZE * 1.5,
    height: ICON_SIZE * 1.5,
    borderRadius: ICON_SIZE * 0.75,
    backgroundColor: alpha(colors.accent, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { alignItems: 'center', gap: space.sm },
  title: { ...textStyles.title, textAlign: 'center' },
  body: { ...textStyles.body, textAlign: 'center' },
  detail: { ...textStyles.callout, textAlign: 'center', marginTop: space.sm },
  actions: { width: '100%', alignItems: 'center', gap: space.sm },
});
