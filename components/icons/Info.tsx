import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Info({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4" />
      <Path d="M12 8h.01" />
    </Svg>
  );
}
