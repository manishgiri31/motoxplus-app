import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

export interface SuccessToastProps {
  message: string;
  onHide: () => void;
  durationMs?: number;
}

// Ink pill with a success-green check, matching the Toast in src/components/ui.
export function SuccessToast({ message, onHide, durationMs = 1800 }: SuccessToastProps) {
  useEffect(() => {
    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [onHide, durationMs]);

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      exiting={FadeOutDown.duration(240)}
      className="absolute bottom-lg left-lg right-lg flex-row items-center gap-sm bg-secondary rounded-lg px-lg py-md min-h-[44px]"
    >
      <Feather name="check-circle" size={18} color="#30D158" />
      <Text className="flex-1 text-[14px] font-semibold text-white">{message}</Text>
    </Animated.View>
  );
}
