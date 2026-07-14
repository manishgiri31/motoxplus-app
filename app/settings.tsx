import { router } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dealerService } from '@/api/services/dealerService';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/useAuth';
import { Button, Chip } from '@/components/ui';
import { useSettingsStore, type ThemePreference } from '@/stores/settingsStore';

const themeOptions: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const { logout } = useAuth();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your dealer account, orders, and invoices. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              await dealerService.deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch (err) {
              Alert.alert('Could not delete account', getErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView contentContainerClassName="p-lg gap-2xl">
        <View className="gap-md">
          <Text className="text-h3 font-semibold text-text">Appearance</Text>
          <View className="flex-row gap-sm">
            {themeOptions.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={themePreference === opt.value}
                onPress={() => setThemePreference(opt.value)}
              />
            ))}
          </View>
        </View>

        <View className="gap-md">
          <Text className="text-h3 font-semibold text-text">Account</Text>
          <Button label="Sign out" variant="outline" onPress={logout} fullWidth />
          <Button label="Delete account" variant="destructive" onPress={confirmDeleteAccount} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
