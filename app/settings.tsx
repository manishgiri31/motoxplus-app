import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { dealerService } from '@/api/services/dealerService';
import { useAuth } from '@/auth/useAuth';
import { PasswordConfirmSheet } from '@/src/components/account/PasswordConfirmSheet';
import { GroupedList, ListRow } from '@/src/components/ui/GroupedList';
import { colors, screenPaddingX, sectionGap, space } from '@/src/theme';

// The Appearance (System/Light/Dark) picker that used to live here is hidden
// — the app is locked to light mode for now (app.json's userInterfaceStyle,
// stores/settingsStore.ts always forcing NativeWind's colorScheme to
// 'light') until dark mode is properly revisited. The theme-preference store
// and its type are untouched, just not surfaced from this screen anymore.
export default function SettingsScreen() {
  const { logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your dealer account, orders, and invoices. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            setPassword('');
            setDeleteError(null);
            setConfirmVisible(true);
          },
        },
      ]
    );
  };

  // Same confirmation as the Sign out row on the Account tab.
  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const closeConfirm = () => {
    if (deleting) return;
    setConfirmVisible(false);
  };

  // The backend re-authenticates with the current password before it will
  // destroy the account — a bare Bearer token isn't enough on its own.
  const handleDelete = async () => {
    if (!password) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await dealerService.deleteAccount({ password });
      setConfirmVisible(false);
      await logout();
      router.replace('/(auth)/login');
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GroupedList header="Account">
          <ListRow label="Sign out" icon="log-out" iconColor={colors.ink2} onPress={confirmLogout} />
        </GroupedList>

        {/* Pushed to the bottom of the screen when the content is short. */}
        <View style={styles.spacer} />

        <GroupedList footer="Permanently deletes your dealer account, orders and invoices. This cannot be undone.">
          <ListRow label="Delete account" centered destructive onPress={confirmDeleteAccount} />
        </GroupedList>
      </ScrollView>

      <PasswordConfirmSheet
        visible={confirmVisible}
        title="Confirm your password"
        message="For your security, re-enter your password to permanently delete this account."
        confirmLabel="Delete account"
        password={password}
        onPasswordChange={(v) => {
          setPassword(v);
          if (deleteError) setDeleteError(null);
        }}
        error={deleteError}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={closeConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: screenPaddingX, paddingTop: space.xl, paddingBottom: space.x4 },
  spacer: { flexGrow: 1, minHeight: sectionGap },
});
