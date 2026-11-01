import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Search({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="m21 21-4.34-4.34" />
      <Circle cx="11" cy="11" r="8" />
    </Svg>
  );
}
