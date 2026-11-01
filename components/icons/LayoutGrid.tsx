import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function LayoutGrid({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Rect width="7" height="7" x="3" y="3" rx="1" />
      <Rect width="7" height="7" x="14" y="3" rx="1" />
      <Rect width="7" height="7" x="14" y="14" rx="1" />
      <Rect width="7" height="7" x="3" y="14" rx="1" />
    </Svg>
  );
}
