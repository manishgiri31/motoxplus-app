import Svg, { Polygon } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Navigation({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Polygon points="3 11 22 2 13 21 11 13 3 11" />
    </Svg>
  );
}
