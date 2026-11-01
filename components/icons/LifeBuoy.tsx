import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function LifeBuoy({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="m4.93 4.93 4.24 4.24" />
      <Path d="m14.83 9.17 4.24-4.24" />
      <Path d="m14.83 14.83 4.24 4.24" />
      <Path d="m9.17 14.83-4.24 4.24" />
      <Circle cx="12" cy="12" r="4" />
    </Svg>
  );
}
