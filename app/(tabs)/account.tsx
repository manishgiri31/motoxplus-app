import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDealerAccount } from '@/api/hooks/useDealerAccount';
import { useAuth } from '@/auth/useAuth';
import { Badge, type BadgeTone } from '@/components/ui';
import { env } from '@/config/env';
import { useThemeColors } from '@/hooks/use-theme-colors';

const dealerStatusTone: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
};

const webOrigin = env.apiUrl.replace(/\/api\/?$/, '');

interface MenuRowProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function MenuRow({ icon, label, onPress, destructive }: MenuRowProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-md px-lg border-b border-border active:bg-surface"
    >
      <View className="flex-row items-center gap-md">
        <Feather name={icon} size={18} color={destructive ? colors.danger : colors.text} />
        <Text className={`text-[15px] ${destructive ? 'text-danger' : 'text-text'}`}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.border} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { user, dealer, logout, logoutAllDevices } = useAuth();
  const { data: dealerAccount } = useDealerAccount();

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const confirmLogoutAll = () => {
    Alert.alert('Sign out everywhere', 'This will end all active sessions on every device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out everywhere', style: 'destructive', onPress: () => logoutAllDevices() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="pb-2xl">
        <View className="px-lg pt-sm pb-lg gap-xs">
          <Text className="text-h2 font-bold text-text">Account</Text>
        </View>

        <View className="mx-lg mb-lg p-lg rounded-lg bg-surface gap-sm">
          <View className="flex-row items-center gap-md">
            <View className="w-14 h-14 rounded-full bg-secondary items-center justify-center">
              <Text className="text-secondary-foreground text-[18px] font-bold">
                {(user?.name ?? dealer?.ownerName ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 gap-xxs">
              <Text className="text-[16px] font-semibold text-text">{user?.name ?? dealerAccount?.ownerName}</Text>
              <Text className="text-[13px] text-muted">{user?.email}</Text>
            </View>
          </View>
          {dealer && (
            <View className="flex-row items-center justify-between mt-sm">
              <Text className="text-[14px] font-medium text-text">{dealer.companyName}</Text>
              <Badge label={dealer.status} tone={dealerStatusTone[dealer.status] ?? 'neutral'} />
            </View>
          )}
          {user && !user.mobileVerified && (
            <Text className="text-[12px] text-warning mt-xs">
              Your mobile number isn&apos;t verified yet — verify it to unlock full account features.
            </Text>
          )}
        </View>

        <View className="mb-lg">
          <MenuRow icon="heart" label="Wishlist" onPress={() => router.push('/wishlist')} />
          <MenuRow icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
          <MenuRow icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        <View className="mb-lg">
          <MenuRow
            icon="mail"
            label="Contact support"
            onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/contact`)}
          />
          <MenuRow icon="shield" label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/privacy`)} />
          <MenuRow icon="file-text" label="Terms of service" onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/terms`)} />
        </View>

        <View>
          <MenuRow icon="log-out" label="Sign out" onPress={confirmLogout} destructive />
          <MenuRow icon="log-out" label="Sign out of all devices" onPress={confirmLogoutAll} destructive />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
