import { Text, View } from 'react-native';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, { container: string; label: string }> = {
  neutral: { container: 'bg-surface border border-border', label: 'text-muted' },
  success: { container: 'bg-success/10', label: 'text-success' },
  warning: { container: 'bg-warning/10', label: 'text-warning' },
  danger: { container: 'bg-danger/10', label: 'text-danger' },
  brand: { container: 'bg-card', label: 'text-text' },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const styles = toneStyles[tone];
  return (
    <View className={`self-start px-md py-xxs rounded-full ${styles.container}`}>
      <Text className={`text-[11px] font-semibold uppercase tracking-wide ${styles.label}`}>{label}</Text>
    </View>
  );
}
