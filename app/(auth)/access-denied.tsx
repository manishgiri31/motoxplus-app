import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEALER_APPLICATION_URL } from '@/auth/access';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';

// Reached two ways, both driven by AuthProvider's `accessDenied` flag
// (auth/AuthProvider.tsx): a login attempt by a non-dealer/unapproved
// account, or a cold start restoring a token that no longer passes
// auth/access.ts#canAccessDealerApp (e.g. approval was revoked since the
// token was issued). The copy below is intentionally generic — it doesn't
// distinguish "wrong role" from "pending application" since we never want
// to hint at exact account state to someone who may not be its owner.
export default function AccessDeniedScreen() {
  const { clearAccessDenied } = useAuth();
  const colors = useThemeColors();

  const backToSignIn = () => {
    clearAccessDenied();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-2xl gap-xl">
        <Text className="text-[13px] font-semibold uppercase tracking-[3px] text-primary">
          MotoXPlus Dealer
        </Text>

        <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
          <Feather name="shield" size={28} color={colors.primary} />
        </View>

        <View className="gap-sm">
          <Text accessibilityRole="header" className="text-[22px] font-extrabold text-text text-center">
            Dealer Access Required
          </Text>
          <Text className="text-[15px] text-muted text-center leading-[22px]">
            This app is available only for approved MotoXPlus dealers.
          </Text>
          <Text className="text-[14px] text-muted text-center leading-[20px] mt-xs">
            {"If you've already applied, please wait until your application is approved.\n"}
            {"If you haven't applied yet, you can submit a dealer application on our website."}
          </Text>
        </View>

        <View className="w-full gap-sm">
          <Button
            label="Apply on Website"
            onPress={() => Linking.openURL(DEALER_APPLICATION_URL)}
            fullWidth
            size="lg"
          />
          <Button label="Back to sign in" variant="ghost" onPress={backToSignIn} fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
}
