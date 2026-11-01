import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Gift({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="M12 7v14" />
      <Path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
      <Path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5" />
      <Rect x="3" y="7" width="18" height="4" rx="1" />
    </Svg>
  );
}
