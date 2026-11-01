import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Mail({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <Rect x="2" y="4" width="20" height="16" rx="2" />
    </Svg>
  );
}
