import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Truck({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <Path d="M15 18H9" />
      <Path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <Circle cx="17" cy="18" r="2" />
      <Circle cx="7" cy="18" r="2" />
    </Svg>
  );
}
