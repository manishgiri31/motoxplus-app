import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Feather>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-2xl py-4xl gap-md">
      <View className="w-16 h-16 rounded-full bg-graytone-100 items-center justify-center">
        <Feather name={icon} size={28} color="#A3A3A3" />
      </View>
      <Text className="text-[17px] font-semibold text-black text-center">{title}</Text>
      {message && <Text className="text-[14px] text-graytone-500 text-center">{message}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="outline" size="sm" onPress={onAction} />
      )}
    </View>
  );
}
