import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Bike({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Circle cx="18.5" cy="17.5" r="3.5" />
      <Circle cx="5.5" cy="17.5" r="3.5" />
      <Circle cx="15" cy="5" r="1" />
      <Path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </Svg>
  );
}
