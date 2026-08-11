import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dealerService } from '@/api/services/dealerService';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';

// The Appearance (System/Light/Dark) picker that used to live here is hidden
// — the app is locked to light mode for now (app.json's userInterfaceStyle,
// stores/settingsStore.ts always forcing NativeWind's colorScheme to
// 'light') until dark mode is properly revisited. The theme-preference store
// and its type are untouched, just not surfaced from this screen anymore.
export default function SettingsScreen() {
  const { logout } = useAuth();

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
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Button label="Sign out" variant="ghost" fullWidth onPress={logout} />
          <Button label="Delete account" variant="brand" fullWidth onPress={confirmDeleteAccount} style={styles.deleteButton} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 32 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  deleteButton: { marginTop: 4 },
});
