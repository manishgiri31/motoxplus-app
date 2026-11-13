import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/useAuth';
import { dealerStatusBadgeTone, dealerStatusLabel } from '@/constants/dealerStatus';
import { Button } from '@/src/components/ui/Button';
import { GroupedList, ListRow } from '@/src/components/ui/GroupedList';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { colors, font, layout, screenPaddingX, sectionGap, space } from '@/src/theme';

// One read-only field: small ink2 label above the value (same layout as the
// grouped InputField). An optional badge sits on the label line, so a long
// value such as an email keeps the full row width instead of breaking
// mid-word next to it. Selectable so a dealer can copy their GST number or
// address.
function FieldRow({ label, value, trailing, tabular }: { label: string; value: string; trailing?: ReactNode; tabular?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel} maxFontSizeMultiplier={layout.maxFontScale}>
          {label}
        </Text>
        {trailing}
      </View>
      <Text selectable style={[styles.fieldValue, tabular && styles.tabular]} maxFontSizeMultiplier={layout.maxFontScale}>
        {value}
      </Text>
    </View>
  );
}

// Read-only view of the dealer's account details, mirroring the web "Profile"
// page. The backend has no edit endpoint (changes go through support), so this
// links to the contact form instead of offering inline editing.
export default function ProfileScreen() {
  const { user, dealer } = useAuth();

  const businessRows = [
    dealer?.companyName && <FieldRow key="company" label="Company name" value={dealer.companyName} />,
    dealer?.ownerName && <FieldRow key="owner" label="Owner name" value={dealer.ownerName} />,
    dealer?.gstNumber && <FieldRow key="gst" label="GST number" value={dealer.gstNumber} tabular />,
    dealer?.address && <FieldRow key="address" label="Address" value={dealer.address} />,
    dealer?.city && <FieldRow key="city" label="City" value={dealer.city} />,
    dealer?.state && <FieldRow key="state" label="State" value={dealer.state} />,
    dealer?.pincode && <FieldRow key="pincode" label="Pincode" value={dealer.pincode} tabular />,
  ];

  const contactRows = [
    user?.email && (
      <FieldRow
        key="email"
        label="Email"
        value={user.email}
        trailing={<StatusBadge label={user.emailVerified ? 'Verified' : 'Not verified'} tone={user.emailVerified ? 'success' : 'warning'} />}
      />
    ),
    dealer?.phone && (
      <FieldRow
        key="phone"
        label="Phone"
        value={dealer.phone}
        tabular
        trailing={user && <StatusBadge label={user.mobileVerified ? 'Verified' : 'Not verified'} tone={user.mobileVerified ? 'success' : 'warning'} />}
      />
    ),
  ];

  const needsEmail = !!user && !user.emailVerified;
  const needsMobile = !!user && !user.mobileVerified;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {dealer && (
          <View style={styles.status}>
            <StatusBadge label={dealerStatusLabel[dealer.status]} tone={dealerStatusBadgeTone[dealer.status]} />
          </View>
        )}

        <GroupedList header="Business">{businessRows}</GroupedList>

        <GroupedList header="Contact" footer="Contact support to edit your details.">
          {contactRows}
        </GroupedList>

        {(needsEmail || needsMobile) && (
          <GroupedList header="Verification">
            {needsEmail && (
              <ListRow label="Verify email" icon="mail" iconColor={colors.warning} onPress={() => router.push('/verify-email')} />
            )}
            {needsMobile && (
              <ListRow
                label="Verify mobile number"
                icon="smartphone"
                iconColor={colors.warning}
                onPress={() => router.push('/verify-mobile')}
              />
            )}
          </GroupedList>
        )}

        <View style={styles.support}>
          <Button label="Contact support" variant="link" onPress={() => router.push('/contact')} />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: screenPaddingX, paddingTop: space.xl, paddingBottom: space.x4, gap: sectionGap },
  status: { alignItems: 'flex-start' },
  field: {
    minHeight: layout.rowMinHeight,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: layout.rowInset,
    paddingVertical: space.md,
  },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  fieldLabel: { flexShrink: 1, ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink2 },
  fieldValue: { ...font(400), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  tabular: { fontVariant: ['tabular-nums'] },
  support: { alignItems: 'center', marginTop: -space.md },
});
