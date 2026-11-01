import Svg, { Line, Path, Rect } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function CreditCard({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Rect width="20" height="14" x="2" y="5" rx="2" />
      <Line x1="2" x2="22" y1="10" y2="10" />
      <Path d="M6 14h2" />
    </Svg>
  );
}
