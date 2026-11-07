import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentType } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDealerAccount } from '@/api/hooks/useDealerAccount';
import { useAuth } from '@/auth/useAuth';
import { FileText } from '@/components/icons/FileText';
import { Headset } from '@/components/icons/Headset';
import { Heart } from '@/components/icons/Heart';
import { Package } from '@/components/icons/Package';
import type { IconProps } from '@/components/icons/types';
import { webOrigin } from '@/config/env';
import { DealerProfileCard } from '@/src/components/account/DealerProfileCard';
import { GroupedList, ListRow } from '@/src/components/ui/GroupedList';
import { CompactTitleBar, LargeTitleHeader, useLargeTitleScroll } from '@/src/components/ui/LargeTitleHeader';
import { colors, radii, screenPaddingX, sectionGap, space, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

const LEGAL_LINE = `© ${new Date().getFullYear()} MotoXPlus. All rights reserved.`;

// Half-width tile: icon and label on a grey card, two per row.
function ShortcutTile({ icon: Icon, label, onPress }: { icon: ComponentType<IconProps>; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <Icon size={20} color={colors.accent} />
      <Text style={styles.tileLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useLargeTitleScroll();
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
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm }]}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitleHeader title="Account" scrollY={scrollY} numberOfLines={1} />

        <View style={styles.section}>
          <DealerProfileCard user={user} dealer={dealer} ownerName={dealerAccount?.ownerName} />

          {/* Marketplace-style shortcuts to the four places dealers go most.
              Each appears only here, not again in the lists below. */}
          <View style={styles.tiles}>
            <ShortcutTile icon={Package} label="Orders" onPress={() => router.push('/(tabs)/orders')} />
            <ShortcutTile icon={Heart} label="Wishlist" onPress={() => router.push('/wishlist')} />
            <ShortcutTile icon={FileText} label="Invoices" onPress={() => router.push('/invoices')} />
            <ShortcutTile icon={Headset} label="Help centre" onPress={() => router.push('/contact')} />
          </View>

          <GroupedList>
            <ListRow label="Profile" icon="user" iconColor={colors.link} onPress={() => router.push('/profile')} />
            <ListRow label="Documents" icon="folder" iconColor={colors.warning} onPress={() => router.push('/documents')} />
            <ListRow label="Notifications" icon="bell" iconColor={colors.ink2} onPress={() => router.push('/notifications')} />
          </GroupedList>

          <GroupedList>
            <ListRow label="Change email" icon="mail" iconColor={colors.link} onPress={() => router.push('/change-email')} />
            <ListRow label="Active sessions" icon="smartphone" iconColor={colors.success} onPress={() => router.push('/sessions')} />
            <ListRow label="Settings" icon="settings" iconColor={colors.ink2} onPress={() => router.push('/settings')} />
          </GroupedList>

          <GroupedList>
            <ListRow
              label="Privacy policy"
              icon="lock"
              iconColor={colors.ink2}
              onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/privacy`)}
            />
            <ListRow
              label="Terms"
              icon="file-text"
              iconColor={colors.ink2}
              onPress={() => WebBrowser.openBrowserAsync(`${webOrigin}/terms`)}
            />
          </GroupedList>

          <GroupedList>
            <ListRow label="Sign out" centered destructive onPress={confirmLogout} />
            <ListRow label="Sign out of all devices" centered destructive onPress={confirmLogoutAll} />
          </GroupedList>
        </View>

        <Text style={styles.legal} maxFontSizeMultiplier={1.2}>
          {LEGAL_LINE}
        </Text>
      </Animated.ScrollView>
      <CompactTitleBar title="Account" scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: space.x4 },
  // The header pads itself by the screen margin; the rest of the content
  // matches it and groups sit a section-gap apart.
  section: { paddingHorizontal: screenPaddingX, marginTop: space.xl, gap: sectionGap },
  legal: { ...textStyles.caption, color: colors.ink3, textAlign: 'center', marginTop: sectionGap, paddingHorizontal: screenPaddingX },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: -space.md },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  tilePressed: { backgroundColor: colors.bgAlt },
  tileLabel: { flex: 1, ...textStyles.headline },
});
