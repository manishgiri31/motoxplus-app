import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

export interface SuccessToastProps {
  message: string;
  onHide: () => void;
  durationMs?: number;
}

// Mirrors Button's "destructive" variant styling (solid tone + white text) —
// same pattern, success color instead of danger.
export function SuccessToast({ message, onHide, durationMs = 1800 }: SuccessToastProps) {
  useEffect(() => {
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [onHide, durationMs]);

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      className="absolute bottom-lg left-lg right-lg flex-row items-center gap-sm bg-success rounded-md px-lg py-md"
    >
      <Feather name="check-circle" size={18} color="white" />
      <Text className="flex-1 text-[14px] font-semibold text-white">{message}</Text>
    </Animated.View>
  );
}
