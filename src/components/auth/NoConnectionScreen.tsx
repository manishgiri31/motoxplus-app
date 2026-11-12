import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { colors, fonts } from '@/src/theme';

// Shown on cold start when a session is stored but the server can't be
// reached and there is no cached account to show. The stored tokens are
// kept — this is deliberately not the login screen.
export function NoConnectionScreen({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Feather name="wifi-off" size={28} color={colors.red} />
        </View>
        <Text style={styles.title}>No connection</Text>
        <Text style={styles.message}>
          We couldn&apos;t reach MotoXplus. Check your internet connection and try again. You&apos;re still signed in.
        </Text>
        <Button
          label={retrying ? 'Retrying…' : 'Retry'}
          variant="brand"
          onPress={onRetry}
          disabled={retrying}
          style={styles.action}
        />
      </View>
    </SafeAreaView>
  );
}

// Thin strip shown while the device is offline, or while the app runs on a
// cached session because the server could not be reached.
export function OfflineBanner({ label }: { label: string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.bannerWrap} pointerEvents="none">
      <View style={styles.banner}>
        <Feather name="wifi-off" size={12} color={colors.paper} />
        <Text style={styles.bannerText}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontFamily: fonts.display.bold, fontSize: 17, letterSpacing: -0.374, color: colors.ink, textAlign: 'center' },
  message: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.muted, textAlign: 'center' },
  action: { marginTop: 12 },
  bannerWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  bannerText: { fontFamily: fonts.body.semiBold, fontSize: 12, color: colors.paper },
});
