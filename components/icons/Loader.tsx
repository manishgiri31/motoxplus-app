import Svg, { Path } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { IconProps } from './types';

export function Loader({ size = 22, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
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
      <Path d="M12 2v4" />
      <Path d="m16.2 7.8 2.9-2.9" />
      <Path d="M18 12h4" />
      <Path d="m16.2 16.2 2.9 2.9" />
      <Path d="M12 18v4" />
      <Path d="m4.9 19.1 2.9-2.9" />
      <Path d="M2 12h4" />
      <Path d="m4.9 4.9 2.9 2.9" />
    </Svg>
  );
}
