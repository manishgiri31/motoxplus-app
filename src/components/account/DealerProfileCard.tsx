import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AuthUser, Dealer } from '@/api/types';
import { dealerStatusBadgeTone, dealerStatusLabel } from '@/constants/dealerStatus';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { colors, font, radii, space, textStyles } from '@/src/theme';

export interface DealerProfileCardProps {
  user: AuthUser | null | undefined;
  dealer: Dealer | null | undefined;
  /** Fallback when the session user has no name yet. */
  ownerName?: string;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

// A verification capsule that opens the OTP screen. The capsule is ~24pt tall,
// so hitSlop brings the tap target up to 44pt.
function VerifyCapsule({ label, href }: { label: string; href: '/verify-email' | '/verify-mobile' }) {
  return (
    <Pressable
      onPress={() => router.push(href)}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the verification code screen"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <StatusBadge label={label} tone="warning" />
    </Pressable>
  );
}

// Dealer card at the top of Account: initials avatar (56), name (21pt), company
// (14pt ink2) and verification state as small capsules. Unverified email or
// mobile shows a warning capsule that opens the OTP screen.
export function DealerProfileCard({ user, dealer, ownerName }: DealerProfileCardProps) {
  const name = user?.name ?? ownerName ?? dealer?.ownerName ?? '';
  const company = dealer?.companyName;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.avatar}
        >
          <Text style={styles.initials} maxFontSizeMultiplier={1.2}>
            {initialsOf(name || company || '?')}
          </Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {name || 'Dealer'}
          </Text>
          {!!company && (
            <Text style={styles.company} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {company}
            </Text>
          )}
          {!!user?.email && (
            <Text style={styles.company} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {user.email}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.capsules}>
        {dealer && <StatusBadge label={dealerStatusLabel[dealer.status]} tone={dealerStatusBadgeTone[dealer.status]} />}
        {user &&
          (user.emailVerified ? (
            <StatusBadge label="Email verified" tone="success" />
          ) : (
            <VerifyCapsule label="Verify email" href="/verify-email" />
          ))}
        {user &&
          (user.mobileVerified ? (
            <StatusBadge label="Mobile verified" tone="success" />
          ) : (
            <VerifyCapsule label="Verify mobile" href="/verify-mobile" />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgAlt, borderRadius: radii.card, padding: space.xl, gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...font(600), fontSize: 21, lineHeight: 25, letterSpacing: -0.42, color: colors.white },
  text: { flex: 1, gap: 2 },
  name: { ...textStyles.cardTitle },
  company: { ...textStyles.callout },
  capsules: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, rowGap: space.md },
  pressed: { opacity: 0.6 },
});
