import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Feather>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 items-center justify-center px-2xl py-4xl gap-md">
      <View className="w-16 h-16 rounded-full bg-surface items-center justify-center">
        <Feather name={icon} size={28} color={colors.muted} />
      </View>
      <Text className="text-[17px] font-semibold text-text text-center">{title}</Text>
      {message && <Text className="text-[14px] text-muted text-center">{message}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="outline" size="sm" onPress={onAction} />
      )}
    </View>
  );
}
