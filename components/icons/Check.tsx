import Svg, { Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Check({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
