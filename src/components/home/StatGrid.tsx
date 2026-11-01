import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CreditCard } from '@/components/icons/CreditCard';
import { Loader } from '@/components/icons/Loader';
import { Truck } from '@/components/icons/Truck';
import { Wallet } from '@/components/icons/Wallet';
import { iconSizes, iconTile } from '@/components/icons/iconSizes';
import type { IconProps } from '@/components/icons/types';
import { Card } from '@/src/components/ui/Card';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { alpha, colors, font, radii, screenPaddingX, textStyles } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

import { SectionError } from './SectionError';

export interface StatGridProps {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Already formatted ("₹12,400"). */
  outstanding: string;
  /** Outstanding balance is above zero: tints its icon. */
  outstandingDue: boolean;
  inTransit: number;
  processing: number;
  pendingPayments: number;
  onOutstanding: () => void;
  onInTransit: () => void;
  onProcessing: () => void;
  onPendingPayments: () => void;
}

interface StatProps {
  icon: ComponentType<IconProps>;
  label: string;
  value: string;
  /** Tints the icon tile in the warning color. */
  attention?: boolean;
  onPress: () => void;
}

const MIN_HEIGHT = 124;

function Stat({ icon: StatIcon, label, value, attention = false, onPress }: StatProps) {
  const tint = attention ? colors.warning : colors.ink2;
  return (
    <Card
      onPress={() => {
        HapticService.light();
        onPress();
      }}
      accessibilityLabel={`${label}: ${value}`}
      style={styles.card}
    >
      <View style={[styles.tile, { backgroundColor: alpha(tint, iconTile.tint) }]}>
        <StatIcon size={iconSizes.tile} color={tint} />
      </View>
      <View style={styles.text}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.2}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      </View>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <Skeleton width={iconTile.box} height={iconTile.box} radius={radii.tile} />
      <View style={styles.text}>
        <Skeleton width="55%" height={28} radius={8} />
        <Skeleton width="75%" height={14} radius={6} />
      </View>
    </View>
  );
}

// 2x2 grid of bgAlt cards: icon tile, 28pt value, 14pt label. Each card pushes
// the relevant screen.
export function StatGrid(props: StatGridProps) {
  if (props.error) return <SectionError what="your account summary" onRetry={props.onRetry} />;

  if (props.loading) {
    return (
      <View style={styles.grid}>
        <View style={styles.row}>
          <StatSkeleton />
          <StatSkeleton />
        </View>
        <View style={styles.row}>
          <StatSkeleton />
          <StatSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <Stat icon={Wallet} label="Outstanding balance" value={props.outstanding} attention={props.outstandingDue} onPress={props.onOutstanding} />
        <Stat icon={Truck} label="In transit" value={String(props.inTransit)} onPress={props.onInTransit} />
      </View>
      <View style={styles.row}>
        <Stat icon={Loader} label="Processing" value={String(props.processing)} onPress={props.onProcessing} />
        <Stat
          icon={CreditCard}
          label="Pending payments"
          value={String(props.pendingPayments)}
          attention={props.pendingPayments > 0}
          onPress={props.onPendingPayments}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { paddingHorizontal: screenPaddingX, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, minHeight: MIN_HEIGHT, padding: 16, justifyContent: 'space-between', gap: 12 },
  skeletonCard: { backgroundColor: colors.bgAlt, borderRadius: radii.card },
  tile: { width: iconTile.box, height: iconTile.box, borderRadius: radii.tile, alignItems: 'center', justifyContent: 'center' },
  text: { gap: 2 },
  value: { ...font(600), fontSize: 28, lineHeight: 34, letterSpacing: -0.56, color: colors.ink },
  label: { ...textStyles.callout },
});
