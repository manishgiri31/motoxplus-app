import { Text, type TextProps } from 'react-native';

import { colors, typography, type ThemeColor } from '@/src/theme';

export interface MonoLabelProps extends TextProps {
  color?: ThemeColor;
}

// SKUs, HSN codes, order IDs, part numbers — anything that should read as
// data rather than prose.
export function MonoLabel({ color = 'muted', style, ...rest }: MonoLabelProps) {
  return <Text style={[typography.mono, { color: colors[color] }, style]} {...rest} />;
}
