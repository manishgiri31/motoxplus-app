import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dealerService } from '@/api/services/dealerService';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Button } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Button label="Sign out" variant="ghost" fullWidth onPress={logout} />
          <Button label="Delete account" variant="brand" fullWidth onPress={confirmDeleteAccount} style={styles.deleteButton} />
        </View>
      </ScrollView>

      <Modal visible={confirmVisible} animationType="fade" transparent onRequestClose={closeConfirm}>
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={closeConfirm} accessibilityRole="button" accessibilityLabel="Close" />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm your password</Text>
            <Text style={styles.modalSubtitle}>
              For your security, re-enter your password to permanently delete this account.
            </Text>
            <Input
              label="Password"
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleDelete}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (deleteError) setDeleteError(null);
              }}
              error={deleteError ?? undefined}
            />
            <Button
              label="Delete account"
              variant="brand"
              fullWidth
              loading={deleting}
              onPress={handleDelete}
              style={styles.modalDeleteButton}
            />
            <Button label="Cancel" variant="ghost" fullWidth onPress={closeConfirm} disabled={deleting} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 32 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  deleteButton: { marginTop: 4 },
  modalContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,24,26,0.4)' },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 20,
    gap: 16,
  },
  modalTitle: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.ink },
  modalSubtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted, marginTop: -8 },
  modalDeleteButton: { marginTop: 4 },
});
