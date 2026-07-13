import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { Button } from './Button';

export interface ErrorStateProps {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, message, onRetry }: ErrorStateProps) {
  const text = message ?? getErrorMessage(error, "Couldn't load this. Please try again.");

  return (
    <View className="flex-1 items-center justify-center px-2xl py-4xl gap-md">
      <View className="w-16 h-16 rounded-full bg-danger/10 items-center justify-center">
        <Feather name="alert-triangle" size={28} color="#C11E1E" />
      </View>
      <Text className="text-[17px] font-semibold text-black text-center">Something went wrong</Text>
      <Text className="text-[14px] text-graytone-500 text-center">{text}</Text>
      {onRetry && <Button label="Try again" variant="primary" size="sm" onPress={onRetry} />}
    </View>
  );
}
