import Svg, { Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function RotateCcw({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <Path d="M3 3v5h5" />
    </Svg>
  );
}
