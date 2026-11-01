import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Image({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <Circle cx="9" cy="9" r="2" />
      <Path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </Svg>
  );
}
