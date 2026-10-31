import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/useAuth';
import { dealerStatusVariant } from '@/constants/dealerStatus';
import { Badge, Button, Card, Reveal } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

// Read-only view of the dealer's account details, mirroring the web "Profile"
// page. The backend has no edit endpoint (changes go through support), so this
// links to the contact form instead of offering inline editing.
export default function ProfileScreen() {
  const { user, dealer } = useAuth();
  const initial = (dealer?.companyName ?? user?.name ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{initial}</Text>
          </View>
          <Text accessibilityRole="header" aria-level={1} style={styles.company}>
            {dealer?.companyName ?? user?.name}
          </Text>
          {!!dealer?.ownerName && <Text style={styles.owner}>{dealer.ownerName}</Text>}
          {dealer && <Badge label={dealer.status} variant={dealerStatusVariant[dealer.status]} />}
        </View>

        <Reveal>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Business</Text>
            <Field label="Company name" value={dealer?.companyName} />
            <Field label="Owner name" value={dealer?.ownerName} />
            <Field label="GST number" value={dealer?.gstNumber} mono />
            <Field label="Address" value={dealer?.address} />
            <Field label="City" value={dealer?.city} />
            <Field label="State" value={dealer?.state} />
            <Field label="Pincode" value={dealer?.pincode} mono />
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Contact and verification</Text>
            <Field label="Email" value={user?.email} />
            <View style={styles.verifyRow}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Badge label={user?.emailVerified ? 'Verified' : 'Not verified'} variant={user?.emailVerified ? 'success' : 'neutral'} />
            </View>
            <Field label="Phone" value={dealer?.phone} />
            <View style={styles.verifyRow}>
              <Text style={styles.fieldLabel}>Mobile</Text>
              <Badge label={user?.mobileVerified ? 'Verified' : 'Not verified'} variant={user?.mobileVerified ? 'success' : 'neutral'} />
            </View>
            {user && !user.emailVerified && (
              <Button label="Verify email" variant="ghost" onPress={() => router.push('/verify-email')} />
            )}
            {user && !user.mobileVerified && (
              <Button label="Verify mobile number" variant="ghost" onPress={() => router.push('/verify-mobile')} />
            )}
          </Card>
        </Reveal>

        <Reveal delay={160}>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Need to change something?</Text>
            <Text style={styles.note}>
              Business details can only be updated by our team. Send us a message and we&apos;ll sort it out.
            </Text>
            <Button label="Contact support" variant="brand" onPress={() => router.push('/contact')} />
          </Card>
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarLabel: { fontFamily: fonts.display.bold, fontSize: 28, letterSpacing: -0.42, color: colors.white },
  company: { fontFamily: fonts.display.bold, fontSize: 28, lineHeight: 31, letterSpacing: -0.42, color: colors.ink, textAlign: 'center' },
  owner: { fontFamily: fonts.body.regular, fontSize: 17, letterSpacing: -0.374, color: colors.muted, marginBottom: 6 },
  card: { gap: 12 },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 21, lineHeight: 23, letterSpacing: -0.315, color: colors.ink },
  field: { gap: 2 },
  fieldLabel: { fontFamily: fonts.body.regular, fontSize: 12, letterSpacing: -0.12, color: colors.muted },
  fieldValue: { fontFamily: fonts.body.medium, fontSize: 17, letterSpacing: -0.374, color: colors.ink },
  mono: { fontVariant: ['tabular-nums'] },
  verifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 20, letterSpacing: -0.224, color: colors.muted },
});
