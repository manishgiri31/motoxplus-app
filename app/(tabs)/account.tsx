import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDealerAccount } from '@/api/hooks/useDealerAccount';
import { useAuth } from '@/auth/useAuth';
import { Avatar, Badge } from '@/components/ui';
import { webOrigin } from '@/config/env';
import { dealerStatusTone } from '@/constants/dealerStatus';
import { Button, Card } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';

interface MenuRowProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function MenuRow({ icon, label, onPress, destructive }: MenuRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.menuRowLeft}>
        <Feather name={icon} size={18} color={destructive ? colors.red : colors.ink} />
        <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.line} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { user, dealer, logout, logoutAllDevices } = useAuth();
  const { data: dealerAccount } = useDealerAccount();
  // Local-only: there's no in-app verify flow yet (pending DLT ID), so this
  // is a stopgap that just stops nagging for the rest of the session instead
  // of showing a warning the dealer has no way to act on.
  const [mobileNagDismissed, setMobileNagDismissed] = useState(false);

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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={user?.name ?? dealer?.ownerName ?? '?'} size={56} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name ?? dealerAccount?.ownerName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
          {dealer && (
            <View style={styles.companyRow}>
              <Text style={styles.companyName}>{dealer.companyName}</Text>
              <Badge label={dealer.status} tone={dealerStatusTone[dealer.status]} />
            </View>
          )}
          {user && !user.mobileVerified && !mobileNagDismissed && (
            <View style={styles.nagRow}>
              <Text style={styles.nagText}>Your mobile number isn&apos;t verified yet — verify it to unlock full account features.</Text>
              <Pressable onPress={() => setMobileNagDismissed(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
                <Feather name="x" size={16} color={colors.muted} />
              </Pressable>
            </View>
          )}
        </Card>

        <View style={styles.menuGroup}>
          <MenuRow icon="heart" label="Wishlist" onPress={() => router.push('/wishlist')} />
          <MenuRow icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
          <MenuRow icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        <View style={styles.menuGroup}>
          <MenuRow icon="mail" label="Contact support" onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/contact`)} />
          <MenuRow icon="shield" label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/privacy`)} />
          <MenuRow icon="file-text" label="Terms of service" onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/terms`)} />
        </View>

        <View style={styles.signOutGroup}>
          <Button label="Sign out" variant="ghost" onPress={confirmLogout} style={styles.signOutButton} />
          <Button label="Sign out of all devices" variant="ghost" onPress={confirmLogoutAll} style={styles.signOutButton} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 24, paddingBottom: 32 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 24, color: colors.ink },
  profileCard: { gap: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontFamily: fonts.body.semiBold, fontSize: 16, color: colors.ink },
  profileEmail: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted },
  companyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  companyName: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.ink },
  nagRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  nagText: { flex: 1, fontFamily: fonts.body.regular, fontSize: 12, color: colors.red },
  menuGroup: { borderTopWidth: 1, borderTopColor: colors.line },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontFamily: fonts.body.regular, fontSize: 15, color: colors.ink },
  menuLabelDestructive: { color: colors.red },
  signOutGroup: { gap: 12 },
  signOutButton: { alignSelf: 'stretch' },
});
