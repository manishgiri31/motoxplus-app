import Svg, { Path } from 'react-native-svg';

import { colors } from '@/src/theme';

export interface FilledHeartProps {
  size?: number;
  color?: string;
}

// Solid heart for "saved" state. Same outline as the stroke-only Heart icon in
// components/icons, filled in.
export function FilledHeart({ size = 22, color = colors.ink }: FilledHeartProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
    </Svg>
  );
}
