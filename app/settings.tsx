import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { dealerService } from '@/api/services/dealerService';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
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
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.chipRow}>
            {themeOptions.map((opt) => {
              const selected = themePreference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setThemePreference(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={opt.label}
                  hitSlop={6}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.redSoft, borderColor: colors.red },
  chipLabel: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.ink },
  chipLabelSelected: { color: colors.red },
  deleteButton: { marginTop: 4 },
});
