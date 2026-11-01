import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Settings2({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="M14 17H5" />
      <Path d="M19 7h-9" />
      <Circle cx="17" cy="17" r="3" />
      <Circle cx="7" cy="7" r="3" />
    </Svg>
  );
}
