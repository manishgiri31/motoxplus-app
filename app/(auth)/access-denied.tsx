import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEALER_APPLICATION_URL } from '@/auth/access';
import { useAuth } from '@/auth/useAuth';
import { Button, Eyebrow } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';

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
        <Eyebrow>MotoXPlus Dealer</Eyebrow>

        <View style={styles.iconCircle}>
          <Feather name="shield" size={28} color={colors.red} />
        </View>

        <View style={styles.textBlock}>
          <Text accessibilityRole="header" style={styles.title}>
            Dealer Access Required
          </Text>
          <Text style={styles.message}>This app is available only for approved MotoXPlus dealers.</Text>
          <Text style={styles.detail}>
            {"If you've already applied, please wait until your application is approved.\n"}
            {"If you haven't applied yet, you can submit a dealer application on our website."}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Apply on Website" variant="brand" fullWidth onPress={() => Linking.openURL(DEALER_APPLICATION_URL)} />
          <Button label="Back to sign in" variant="ghost" fullWidth onPress={backToSignIn} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 20 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { gap: 8 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 22, color: colors.ink, textAlign: 'center' },
  message: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  detail: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  actions: { width: '100%', gap: 12, marginTop: 8 },
});
